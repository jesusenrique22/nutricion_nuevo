import type {
  ConsultationModality,
  ConsultationType,
  Resource,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getPaymentQuerySelect } from "@/lib/payment-query-select";
import { prisma } from "@/server/db/prisma";
import type { ProductItem } from "@/types/products";
import { getPaymentChatPolicy } from "@/lib/payment-chat-policy";
import { buildPaymentCreateData } from "@/lib/payment-split";
import { resolveCalendarAdminIdForNewAppointment } from "@/lib/calendar-admin-resolve";
import {
  assertNoOverlapInTransaction,
  validateAppointmentSlot,
} from "@/server/services/scheduling.service";
import { notifyAppointmentBooked } from "@/server/services/appointment-notify.service";
import { notifyReviewRequested } from "@/server/services/review-notify.service";
import {
  notifyPurchaseSubmitted,
  type PurchaseItemKind,
} from "@/server/services/purchase-notify.service";
import {
  isTimeSlotConflictError,
  TIME_SLOT_TAKEN_MESSAGE,
} from "@/lib/scheduling-errors";
import { applyPercentOff } from "@/lib/coupon-math";
import { clampPercentOff } from "@/lib/coupons";
import { applyRemainderCartPayment } from "@/lib/appointment-remainder-checkout";

type PurchaseNotifyItem = { title: string; kind: PurchaseItemKind };

export type CartPaymentPayload = {
  patientPaymentMethod: string;
  patientPaymentReference: string | null;
  patientPaymentNote: string | null;
  patientPaymentProofUrls: string[];
};

type CartAppointmentItem = {
  consultationTypeId: string;
  appointmentStart: Date;
  modality: ConsultationModality;
  consultationType: ConsultationType;
};

type CartResourceItem = {
  resourceId: string;
  resource: Resource;
};

type CartProductItem = {
  productId: string;
  product: ProductItem;
  quantity: number;
};

type CartRemainderItem = {
  appointmentId: string;
};

/** Cita PENDING del mismo slot aún sin confirmar por admin (reintento tras checkout parcial). */
export async function findReusableCartAppointment(params: {
  patientId: string;
  consultationTypeId: string;
  startTime: Date;
}) {
  const paymentSelect = await getPaymentQuerySelect();
  const candidates = await prisma.appointment.findMany({
    where: {
      patientId: params.patientId,
      consultationTypeId: params.consultationTypeId,
      startTime: params.startTime,
      status: "PENDING",
    },
    include: { payment: { select: paymentSelect } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    candidates.find(
      (appt) =>
        appt.payment?.status === "PENDING" &&
        appt.payment.advanceStatus === "PENDING",
    ) ?? null
  );
}

async function applyAppointmentPayment(
  appointmentId: string,
  payload: CartPaymentPayload,
) {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    select: { id: true },
  });
  if (!payment) {
    throw new Error(
      "No se encontró el registro de pago de la cita. Volvé a agregar la cita al carrito.",
    );
  }

  await prisma.payment.update({
    where: { appointmentId },
    data: {
      patientPaymentMethod: payload.patientPaymentMethod,
      patientPaymentReference: payload.patientPaymentReference,
      patientPaymentNote: payload.patientPaymentNote,
      patientPaymentProofUrls: payload.patientPaymentProofUrls,
    },
  });
}

async function createCartAppointment(params: {
  patientId: string;
  item: CartAppointmentItem;
  excludeAppointmentId?: string;
  /** Precio de lista de la consulta (sin descuento). */
  totalPrice?: Prisma.Decimal;
  /** Descuento del cupón; se resta del último pago. */
  discountAmount?: Prisma.Decimal;
}) {
  const validation = await validateAppointmentSlot({
    consultationType: params.item.consultationType,
    startTime: params.item.appointmentStart,
    modality: params.item.modality,
    excludeAppointmentId: params.excludeAppointmentId,
  });
  if (!validation.ok) {
    return { ok: false as const, message: validation.message };
  }

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: params.patientId },
    select: { hasCompletedIntake: true },
  });
  const flow = profile?.hasCompletedIntake ? "FOLLOW_UP" : "INTAKE";
  const paymentPolicy = await getPaymentChatPolicy();
  const calendarAdminId = await resolveCalendarAdminIdForNewAppointment();
  const totalPrice =
    params.totalPrice ?? params.item.consultationType.price;

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      await assertNoOverlapInTransaction(tx, {
        startTime: params.item.appointmentStart,
        endTime: validation.endTime,
        excludeAppointmentId: params.excludeAppointmentId,
      });

      const created = await tx.appointment.create({
        data: {
          patientId: params.patientId,
          consultationTypeId: params.item.consultationTypeId,
          startTime: params.item.appointmentStart,
          endTime: validation.endTime,
          modality: params.item.modality,
          flow,
          status: "PENDING",
          ...(calendarAdminId ? { calendarAdminId } : {}),
        },
        select: { id: true },
      });

      await tx.payment.create({
        data: {
          appointmentId: created.id,
          ...buildPaymentCreateData({
            totalPrice,
            consultationCode: params.item.consultationType.code,
            policy: paymentPolicy,
            discountAmount: params.discountAmount,
          }),
        },
      });

      return created;
    });

    return { ok: true as const, appointmentId: appointment.id, created: true };
  } catch (err) {
    if (isTimeSlotConflictError(err)) {
      return { ok: false as const, message: TIME_SLOT_TAKEN_MESSAGE };
    }
    throw err;
  }
}

export async function fulfillCartCheckout(params: {
  patientId: string;
  patientName: string;
  appointmentItems: CartAppointmentItem[];
  remainderItems?: CartRemainderItem[];
  resourceItems: CartResourceItem[];
  productItems: CartProductItem[];
  paymentPayload: CartPaymentPayload | null;
  /** Porcentaje de descuento del cupón (1–100). */
  couponPercentOff?: number | null;
}): Promise<
  | { ok: true; newAppointmentIds: string[] }
  | { ok: false; message: string }
> {
  const newAppointmentIds: string[] = [];
  // El cupón aplica SOLO a las consultas: recursos y productos van a precio pleno.
  const percentOff = params.couponPercentOff
    ? clampPercentOff(params.couponPercentOff)
    : 0;
  const consultationDiscount = (price: Prisma.Decimal): Prisma.Decimal =>
    percentOff > 0
      ? price.sub(applyPercentOff(price, percentOff)).toDecimalPlaces(2)
      : new Prisma.Decimal(0);

  for (const item of params.appointmentItems) {
    const reusable = await findReusableCartAppointment({
      patientId: params.patientId,
      consultationTypeId: item.consultationTypeId,
      startTime: item.appointmentStart,
    });

    const listPrice = new Prisma.Decimal(item.consultationType.price);
    const discountAmount = consultationDiscount(listPrice);
    const payableTotal = listPrice.sub(discountAmount);

    let appointmentId: string;

    if (reusable) {
      appointmentId = reusable.id;
      // Recalcular pago pendiente con el descuento actual si aún no se pagó.
      if (
        reusable.payment &&
        reusable.payment.advanceStatus === "PENDING" &&
        percentOff > 0
      ) {
        const paymentPolicy = await getPaymentChatPolicy();
        const data = buildPaymentCreateData({
          totalPrice: listPrice,
          consultationCode: item.consultationType.code,
          policy: paymentPolicy,
          discountAmount,
        });
        await prisma.payment.update({
          where: { appointmentId },
          data: {
            amount: data.amount,
            advanceAmount: data.advanceAmount,
            remainderAmount: data.remainderAmount,
            advancePercent: data.advancePercent,
          },
        });
      }
    } else {
      const created = await createCartAppointment({
        patientId: params.patientId,
        item,
        totalPrice: listPrice,
        discountAmount,
      });
      if (!created.ok) {
        return {
          ok: false,
          message: `${item.consultationType.name}: ${created.message}`,
        };
      }
      appointmentId = created.appointmentId;
      if (created.created) {
        newAppointmentIds.push(appointmentId);
      }
    }

    if (params.paymentPayload && payableTotal.toNumber() > 0) {
      await applyAppointmentPayment(appointmentId, params.paymentPayload);
    }
  }

  for (const item of params.remainderItems ?? []) {
    if (!params.paymentPayload) {
      return {
        ok: false,
        message: "Seleccioná un modo de pago para el saldo de la cita.",
      };
    }
    const res = await applyRemainderCartPayment({
      patientId: params.patientId,
      patientName: params.patientName,
      appointmentId: item.appointmentId,
      payload: params.paymentPayload,
    });
    if (!res.ok) {
      return { ok: false, message: res.message };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of params.resourceItems) {
      const priceDec = new Prisma.Decimal(item.resource.price);
      const isFree = priceDec.toNumber() === 0;
      const paidPayload =
        !isFree && params.paymentPayload
          ? {
              patientPaymentMethod: params.paymentPayload.patientPaymentMethod,
              patientPaymentReference:
                params.paymentPayload.patientPaymentReference,
              patientPaymentNote: params.paymentPayload.patientPaymentNote,
              patientPaymentProofUrls:
                params.paymentPayload.patientPaymentProofUrls,
            }
          : {
              patientPaymentMethod: null,
              patientPaymentReference: null,
              patientPaymentNote: null,
              patientPaymentProofUrls: [] as string[],
            };

      await tx.resourcePurchase.upsert({
        where: {
          userId_resourceId: {
            userId: params.patientId,
            resourceId: item.resourceId,
          },
        },
        create: {
          userId: params.patientId,
          resourceId: item.resourceId,
          pricePaid: priceDec,
          status: isFree ? "GRANTED" : "PENDING",
          grantedAt: isFree ? new Date() : null,
          ...paidPayload,
        },
        update: {
          pricePaid: priceDec,
          status: isFree ? "GRANTED" : "PENDING",
          ...(isFree ? {} : paidPayload),
        },
      });
    }

    for (const item of params.productItems) {
      const qty = Math.max(1, item.quantity ?? 1);
      const unitPrice = item.product.price;
      const lineDec = new Prisma.Decimal(unitPrice * qty);
      const isFree = lineDec.toNumber() <= 0;
      const paidPayload =
        !isFree && params.paymentPayload
          ? {
              patientPaymentMethod: params.paymentPayload.patientPaymentMethod,
              patientPaymentReference:
                params.paymentPayload.patientPaymentReference,
              patientPaymentNote: params.paymentPayload.patientPaymentNote,
              patientPaymentProofUrls:
                params.paymentPayload.patientPaymentProofUrls,
            }
          : {
              patientPaymentMethod: null,
              patientPaymentReference: null,
              patientPaymentNote: null,
              patientPaymentProofUrls: [] as string[],
            };

      await tx.productPurchase.upsert({
        where: {
          userId_productId: {
            userId: params.patientId,
            productId: item.productId,
          },
        },
        create: {
          userId: params.patientId,
          productId: item.productId,
          productName: item.product.name,
          quantity: qty,
          pricePaid: lineDec,
          currency: item.product.currency,
          status: isFree ? "GRANTED" : "PENDING",
          grantedAt: isFree ? new Date() : null,
          ...paidPayload,
        },
        update: {
          productName: item.product.name,
          quantity: qty,
          pricePaid: lineDec,
          currency: item.product.currency,
          status: isFree ? "GRANTED" : "PENDING",
          ...(isFree ? { grantedAt: new Date() } : paidPayload),
        },
      });
    }

    await tx.cartItem.deleteMany({ where: { userId: params.patientId } });
  });

  const pendingPurchases: PurchaseNotifyItem[] = [];
  const grantedPurchases: PurchaseNotifyItem[] = [];

  for (const item of params.resourceItems) {
    const isFree = new Prisma.Decimal(item.resource.price).toNumber() === 0;
    if (isFree) {
      grantedPurchases.push({ title: item.resource.title, kind: "RESOURCE" });
      await notifyReviewRequested({
        patientId: params.patientId,
        itemTitle: item.resource.title,
        itemKind: "RESOURCE",
        entityId: item.resourceId,
      });
    } else {
      pendingPurchases.push({ title: item.resource.title, kind: "RESOURCE" });
    }
  }

  for (const item of params.productItems) {
    const qty = Math.max(1, item.quantity ?? 1);
    const isFree = new Prisma.Decimal(item.product.price * qty).toNumber() <= 0;
    if (isFree) {
      grantedPurchases.push({ title: item.product.name, kind: "PRODUCT" });
      await notifyReviewRequested({
        patientId: params.patientId,
        itemTitle: item.product.name,
        itemKind: "PRODUCT",
        entityId: item.productId,
      });
    } else {
      pendingPurchases.push({ title: item.product.name, kind: "PRODUCT" });
    }
  }

  await notifyPurchaseSubmitted({
    patientId: params.patientId,
    patientName: params.patientName,
    pendingItems: pendingPurchases,
    grantedItems: grantedPurchases,
  });

  for (const appointmentId of newAppointmentIds) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { consultationType: true, payment: true },
    });
    if (!appt) continue;
    await notifyAppointmentBooked({
      patientId: params.patientId,
      patientName: params.patientName,
      consultationName: appt.consultationType.name,
      startTime: appt.startTime,
      appointmentId: appt.id,
      // Reserva por carrito: la cita no está confirmada hasta que se apruebe el pago.
      awaitingPayment: (appt.payment?.amount.toNumber() ?? 0) > 0,
    });
    const { syncAppointmentToGoogleCalendar } = await import(
      "@/server/services/google-calendar-sync.service"
    );
    await syncAppointmentToGoogleCalendar(appt.id);
  }

  return { ok: true, newAppointmentIds };
}
