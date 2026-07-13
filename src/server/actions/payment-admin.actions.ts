"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { grantResourceAccess } from "@/server/actions/resource.actions";
import {
  markAdvancePaid,
  markPaymentRefunded,
  markRemainderPaid,
} from "@/server/actions/payment.actions";

import { parseAdminPaymentItemId } from "@/lib/admin-payment-item";
import { formatActionError } from "@/lib/db-errors";
import { notifyReviewRequested } from "@/server/services/review-notify.service";

export type PaymentAdminActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateAll(patientId?: string) {
  revalidatePath("/dashboard/admin/payments");
  revalidatePath("/dashboard/admin/resources");
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath("/dashboard/patient/library");
  revalidatePath("/dashboard/patient/products");
  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard/patient/progress");
  if (patientId) {
    revalidatePath(`/dashboard/admin/patients/${patientId}`);
  }
}

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

async function runPaymentAdminAction(
  label: string,
  fn: () => Promise<PaymentAdminActionResult>,
  fallback: string,
): Promise<PaymentAdminActionResult> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[payment-admin:${label}]`, err);
    return { ok: false, message: formatActionError(err, fallback) };
  }
}

export async function approveResourcePayment(params: {
  purchaseId: string;
  adminNote?: string;
}): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "approveResourcePayment",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const purchase = await prisma.resourcePurchase.findUnique({
        where: { id: params.purchaseId },
        select: { userId: true, resourceId: true, status: true },
      });
      if (!purchase || purchase.status !== "PENDING") {
        return { ok: false, message: "Solicitud no encontrada o ya procesada." };
      }

      const res = await grantResourceAccess({
        userId: purchase.userId,
        resourceId: purchase.resourceId,
        adminNote: params.adminNote,
      });
      if (!res.ok) return res;

      revalidateAll(purchase.userId);
      return { ok: true };
    },
    "No se pudo aprobar el pago del recurso.",
  );
}

export async function rejectResourcePayment(
  purchaseId: string,
): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "rejectResourcePayment",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const purchase = await prisma.resourcePurchase.findUnique({
        where: { id: purchaseId },
        select: { userId: true, resourceId: true, status: true },
      });
      if (!purchase || purchase.status !== "PENDING") {
        return { ok: false, message: "Solicitud no encontrada." };
      }

      await prisma.$transaction([
        prisma.cartItem.deleteMany({
          where: {
            userId: purchase.userId,
            resourceId: purchase.resourceId,
          },
        }),
        prisma.resourcePurchase.delete({ where: { id: purchaseId } }),
      ]);

      revalidateAll(purchase.userId);
      return { ok: true };
    },
    "No se pudo rechazar el pago del recurso.",
  );
}

export async function approveProductPayment(params: {
  purchaseId: string;
  adminNote?: string;
}): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "approveProductPayment",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const purchase = await prisma.productPurchase.findUnique({
        where: { id: params.purchaseId },
        select: { userId: true, status: true, productName: true },
      });
      if (!purchase || purchase.status !== "PENDING") {
        return { ok: false, message: "Solicitud no encontrada o ya procesada." };
      }

      await prisma.productPurchase.update({
        where: { id: params.purchaseId },
        data: {
          status: "GRANTED",
          grantedAt: new Date(),
          adminNote: params.adminNote ?? null,
        },
      });

      await notifyReviewRequested({
        patientId: purchase.userId,
        itemTitle: purchase.productName,
        itemKind: "PRODUCT",
        entityId: params.purchaseId,
      });

      revalidateAll(purchase.userId);
      return { ok: true };
    },
    "No se pudo aprobar el pago del producto.",
  );
}

export async function rejectProductPayment(
  purchaseId: string,
): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "rejectProductPayment",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const purchase = await prisma.productPurchase.findUnique({
        where: { id: purchaseId },
        select: { userId: true, productId: true, status: true },
      });
      if (!purchase || purchase.status !== "PENDING") {
        return { ok: false, message: "Solicitud no encontrada." };
      }

      await prisma.$transaction([
        prisma.cartItem.deleteMany({
          where: {
            userId: purchase.userId,
            productId: purchase.productId,
          },
        }),
        prisma.productPurchase.delete({ where: { id: purchaseId } }),
      ]);

      revalidateAll(purchase.userId);
      return { ok: true };
    },
    "No se pudo rechazar el pago del producto.",
  );
}

export async function approveAppointmentAdvance(params: {
  appointmentId: string;
  adminNote?: string;
}): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "approveAppointmentAdvance",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const res = await markAdvancePaid({
        appointmentId: params.appointmentId,
        adminNote: params.adminNote,
      });
      if (!res.ok) return res;

      const appt = await prisma.appointment.findUnique({
        where: { id: params.appointmentId },
        select: { patientId: true },
      });
      revalidateAll(appt?.patientId);
      return { ok: true };
    },
    "No se pudo aprobar el adelanto.",
  );
}

export async function approveAppointmentRemainder(params: {
  appointmentId: string;
  adminNote?: string;
}): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "approveAppointmentRemainder",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const res = await markRemainderPaid({
        appointmentId: params.appointmentId,
        adminNote: params.adminNote,
      });
      if (!res.ok) return res;

      const appt = await prisma.appointment.findUnique({
        where: { id: params.appointmentId },
        select: { patientId: true },
      });
      revalidateAll(appt?.patientId);
      return { ok: true };
    },
    "No se pudo aprobar el saldo.",
  );
}

export async function rejectAppointmentPayment(
  appointmentId: string,
): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "rejectAppointmentPayment",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const res = await markPaymentRefunded(appointmentId);
      if (!res.ok) return res;

      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { patientId: true },
      });
      revalidateAll(appt?.patientId);
      return { ok: true };
    },
    "No se pudo rechazar el pago de la cita.",
  );
}

export async function trashPaymentInboxItem(
  itemId: string,
): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "trashPaymentInboxItem",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const parsed = parseAdminPaymentItemId(itemId);
      if (!parsed) return { ok: false, message: "Ítem no reconocido." };

      const now = new Date();

      if (parsed.kind === "RESOURCE") {
        const purchase = await prisma.resourcePurchase.findUnique({
          where: { id: parsed.purchaseId },
          select: { userId: true, status: true, inboxDismissedAt: true },
        });
        if (
          !purchase ||
          purchase.status !== "PENDING" ||
          purchase.inboxDismissedAt
        ) {
          return { ok: false, message: "Solicitud no encontrada." };
        }
        await prisma.resourcePurchase.update({
          where: { id: parsed.purchaseId },
          data: { inboxTrashedAt: now },
        });
        revalidateAll(purchase.userId);
        return { ok: true };
      }

      if (parsed.kind === "PRODUCT") {
        const purchase = await prisma.productPurchase.findUnique({
          where: { id: parsed.purchaseId },
          select: { userId: true, status: true, inboxDismissedAt: true },
        });
        if (
          !purchase ||
          purchase.status !== "PENDING" ||
          purchase.inboxDismissedAt
        ) {
          return { ok: false, message: "Solicitud no encontrada." };
        }
        await prisma.productPurchase.update({
          where: { id: parsed.purchaseId },
          data: { inboxTrashedAt: now },
        });
        revalidateAll(purchase.userId);
        return { ok: true };
      }

      const payment = await prisma.payment.findUnique({
        where: { appointmentId: parsed.appointmentId },
        select: { appointment: { select: { patientId: true } } },
      });
      if (!payment) return { ok: false, message: "Pago no encontrado." };

      if (parsed.kind === "APPOINTMENT_ADVANCE") {
        await prisma.payment.update({
          where: { appointmentId: parsed.appointmentId },
          data: { advanceInboxTrashedAt: now },
        });
      } else {
        await prisma.payment.update({
          where: { appointmentId: parsed.appointmentId },
          data: { remainderInboxTrashedAt: now },
        });
      }

      revalidateAll(payment.appointment.patientId);
      return { ok: true };
    },
    "No se pudo mover el pago a la papelera.",
  );
}

export async function restorePaymentInboxItem(
  itemId: string,
): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "restorePaymentInboxItem",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const parsed = parseAdminPaymentItemId(itemId);
      if (!parsed) return { ok: false, message: "Ítem no reconocido." };

      if (parsed.kind === "RESOURCE") {
        const purchase = await prisma.resourcePurchase.findUnique({
          where: { id: parsed.purchaseId },
          select: { userId: true, status: true },
        });
        if (!purchase || purchase.status !== "PENDING") {
          return { ok: false, message: "Solicitud no encontrada." };
        }
        await prisma.resourcePurchase.update({
          where: { id: parsed.purchaseId },
          data: { inboxTrashedAt: null },
        });
        revalidateAll(purchase.userId);
        return { ok: true };
      }

      if (parsed.kind === "PRODUCT") {
        const purchase = await prisma.productPurchase.findUnique({
          where: { id: parsed.purchaseId },
          select: { userId: true, status: true },
        });
        if (!purchase || purchase.status !== "PENDING") {
          return { ok: false, message: "Solicitud no encontrada." };
        }
        await prisma.productPurchase.update({
          where: { id: parsed.purchaseId },
          data: { inboxTrashedAt: null },
        });
        revalidateAll(purchase.userId);
        return { ok: true };
      }

      const payment = await prisma.payment.findUnique({
        where: { appointmentId: parsed.appointmentId },
        select: { appointment: { select: { patientId: true } } },
      });
      if (!payment) return { ok: false, message: "Pago no encontrado." };

      if (parsed.kind === "APPOINTMENT_ADVANCE") {
        await prisma.payment.update({
          where: { appointmentId: parsed.appointmentId },
          data: { advanceInboxTrashedAt: null },
        });
      } else {
        await prisma.payment.update({
          where: { appointmentId: parsed.appointmentId },
          data: { remainderInboxTrashedAt: null },
        });
      }

      revalidateAll(payment.appointment.patientId);
      return { ok: true };
    },
    "No se pudo restaurar el pago.",
  );
}

export async function permanentlyDeletePaymentInboxItem(
  itemId: string,
): Promise<PaymentAdminActionResult> {
  return runPaymentAdminAction(
    "permanentlyDeletePaymentInboxItem",
    async () => {
      if (!(await requireAdmin())) {
        return { ok: false, message: "No autorizado." };
      }

      const parsed = parseAdminPaymentItemId(itemId);
      if (!parsed) return { ok: false, message: "Ítem no reconocido." };

      const now = new Date();

      if (parsed.kind === "RESOURCE") {
        const purchase = await prisma.resourcePurchase.findUnique({
          where: { id: parsed.purchaseId },
          select: { userId: true, status: true, inboxTrashedAt: true },
        });
        if (
          !purchase ||
          purchase.status !== "PENDING" ||
          !purchase.inboxTrashedAt
        ) {
          return {
            ok: false,
            message: "Solo podés eliminar ítems en la papelera.",
          };
        }
        await prisma.resourcePurchase.update({
          where: { id: parsed.purchaseId },
          data: { inboxDismissedAt: now, inboxTrashedAt: null },
        });
        revalidateAll(purchase.userId);
        return { ok: true };
      }

      if (parsed.kind === "PRODUCT") {
        const purchase = await prisma.productPurchase.findUnique({
          where: { id: parsed.purchaseId },
          select: { userId: true, status: true, inboxTrashedAt: true },
        });
        if (
          !purchase ||
          purchase.status !== "PENDING" ||
          !purchase.inboxTrashedAt
        ) {
          return {
            ok: false,
            message: "Solo podés eliminar ítems en la papelera.",
          };
        }
        await prisma.productPurchase.update({
          where: { id: parsed.purchaseId },
          data: { inboxDismissedAt: now, inboxTrashedAt: null },
        });
        revalidateAll(purchase.userId);
        return { ok: true };
      }

      const payment = await prisma.payment.findUnique({
        where: { appointmentId: parsed.appointmentId },
        select: {
          advanceInboxTrashedAt: true,
          remainderInboxTrashedAt: true,
          appointment: { select: { patientId: true } },
        },
      });
      if (!payment) return { ok: false, message: "Pago no encontrado." };

      if (parsed.kind === "APPOINTMENT_ADVANCE") {
        if (!payment.advanceInboxTrashedAt) {
          return {
            ok: false,
            message: "Solo podés eliminar ítems en la papelera.",
          };
        }
        await prisma.payment.update({
          where: { appointmentId: parsed.appointmentId },
          data: {
            advanceInboxDismissedAt: now,
            advanceInboxTrashedAt: null,
          },
        });
      } else {
        if (!payment.remainderInboxTrashedAt) {
          return {
            ok: false,
            message: "Solo podés eliminar ítems en la papelera.",
          };
        }
        await prisma.payment.update({
          where: { appointmentId: parsed.appointmentId },
          data: {
            remainderInboxDismissedAt: now,
            remainderInboxTrashedAt: null,
          },
        });
      }

      revalidateAll(payment.appointment.patientId);
      return { ok: true };
    },
    "No se pudo eliminar el pago permanentemente.",
  );
}
