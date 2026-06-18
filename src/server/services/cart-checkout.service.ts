import type {
  ConsultationModality,
  ConsultationType,
  Resource,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getPaymentChatPolicy } from "@/lib/payment-chat-policy";
import { buildPaymentCreateData } from "@/lib/payment-split";
import { validateAppointmentSlot } from "@/server/services/scheduling.service";
import { notifyAppointmentBooked } from "@/server/services/appointment-notify.service";

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

/** Cita PENDING del mismo slot aún sin confirmar por admin (reintento tras checkout parcial). */
export async function findReusableCartAppointment(params: {
  patientId: string;
  consultationTypeId: string;
  startTime: Date;
}) {
  const candidates = await prisma.appointment.findMany({
    where: {
      patientId: params.patientId,
      consultationTypeId: params.consultationTypeId,
      startTime: params.startTime,
      status: "PENDING",
    },
    include: { payment: true },
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

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        patientId: params.patientId,
        consultationTypeId: params.item.consultationTypeId,
        startTime: params.item.appointmentStart,
        endTime: validation.endTime,
        modality: params.item.modality,
        flow,
        status: "PENDING",
      },
      select: { id: true },
    });

    await tx.payment.create({
      data: {
        appointmentId: created.id,
        ...buildPaymentCreateData({
          totalPrice: params.item.consultationType.price,
          consultationCode: params.item.consultationType.code,
          policy: paymentPolicy,
        }),
      },
    });

    return created;
  });

  return { ok: true as const, appointmentId: appointment.id, created: true };
}

export async function fulfillCartCheckout(params: {
  patientId: string;
  patientName: string;
  appointmentItems: CartAppointmentItem[];
  resourceItems: CartResourceItem[];
  paymentPayload: CartPaymentPayload | null;
}): Promise<
  | { ok: true; newAppointmentIds: string[] }
  | { ok: false; message: string }
> {
  const newAppointmentIds: string[] = [];

  for (const item of params.appointmentItems) {
    const reusable = await findReusableCartAppointment({
      patientId: params.patientId,
      consultationTypeId: item.consultationTypeId,
      startTime: item.appointmentStart,
    });

    let appointmentId: string;

    if (reusable) {
      appointmentId = reusable.id;
    } else {
      const created = await createCartAppointment({
        patientId: params.patientId,
        item,
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

    if (
      params.paymentPayload &&
      item.consultationType.price.toNumber() > 0
    ) {
      await applyAppointmentPayment(appointmentId, params.paymentPayload);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of params.resourceItems) {
      const isFree = item.resource.price.toNumber() === 0;
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
          pricePaid: item.resource.price,
          status: isFree ? "GRANTED" : "PENDING",
          grantedAt: isFree ? new Date() : null,
          ...paidPayload,
        },
        update: {
          status: isFree ? "GRANTED" : "PENDING",
          ...(isFree ? {} : paidPayload),
        },
      });
    }

    await tx.cartItem.deleteMany({ where: { userId: params.patientId } });
  });

  for (const appointmentId of newAppointmentIds) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { consultationType: true },
    });
    if (!appt) continue;
    await notifyAppointmentBooked({
      patientId: params.patientId,
      patientName: params.patientName,
      consultationName: appt.consultationType.name,
      startTime: appt.startTime,
      appointmentId: appt.id,
    });
  }

  return { ok: true, newAppointmentIds };
}
