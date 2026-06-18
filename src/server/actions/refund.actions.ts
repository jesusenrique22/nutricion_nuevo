"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import {
  notifyRefundRequested,
  notifyRefundResolved,
} from "@/server/services/refund-notify.service";
import { formatActionError } from "@/lib/db-errors";

export type RefundActionResult =
  | { ok: true }
  | { ok: false; message: string };

function revalidateRefundPaths(patientId: string) {
  revalidatePath("/dashboard/patient/progress");
  revalidatePath("/dashboard/patient/library");
  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard/admin/payments");
  revalidatePath("/dashboard/notifications");
  revalidatePath(`/dashboard/admin/patients/${patientId}`);
}

export async function requestAppointmentRefund(params: {
  appointmentId: string;
  note?: string;
}): Promise<RefundActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return { ok: false, message: "No autorizado." };
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: { payment: true, consultationType: true, patient: true },
  });

  if (!appt || appt.patientId !== session.user.id) {
    return { ok: false, message: "Cita no encontrada." };
  }
  if (!appt.payment) {
    return { ok: false, message: "Esta cita no tiene pago registrado." };
  }
  if (appt.payment.status === "REFUNDED") {
    return { ok: false, message: "Este pago ya fue reembolsado." };
  }
  if (appt.payment.refundStatus === "REQUESTED") {
    return { ok: false, message: "Ya tienes una solicitud de reembolso pendiente." };
  }
  if (appt.payment.refundStatus !== "NONE") {
    return { ok: false, message: "Esta solicitud de reembolso ya fue resuelta." };
  }

  await prisma.payment.update({
    where: { id: appt.payment.id },
    data: {
      refundStatus: "REQUESTED",
      refundRequestedAt: new Date(),
      refundPatientNote: params.note?.trim() || null,
    },
  });

  await notifyRefundRequested({
    patientId: appt.patientId,
    patientName: appt.patient.name,
    itemTitle: appt.consultationType.name,
    itemKind: "APPOINTMENT",
    entityId: appt.id,
  });

  revalidateRefundPaths(appt.patientId);
  return { ok: true };
}

export async function requestResourceRefund(params: {
  purchaseId: string;
  note?: string;
}): Promise<RefundActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return { ok: false, message: "No autorizado." };
  }

  const purchase = await prisma.resourcePurchase.findUnique({
    where: { id: params.purchaseId },
    include: { resource: true, user: true },
  });

  if (!purchase || purchase.userId !== session.user.id) {
    return { ok: false, message: "Compra no encontrada." };
  }
  if (purchase.status === "REFUNDED") {
    return { ok: false, message: "Este recurso ya fue reembolsado." };
  }
  if (purchase.refundStatus === "REQUESTED") {
    return { ok: false, message: "Ya tienes una solicitud de reembolso pendiente." };
  }
  if (purchase.refundStatus !== "NONE") {
    return { ok: false, message: "Esta solicitud de reembolso ya fue resuelta." };
  }
  if (purchase.pricePaid.toNumber() <= 0) {
    return { ok: false, message: "Los recursos gratuitos no admiten reembolso." };
  }

  await prisma.resourcePurchase.update({
    where: { id: purchase.id },
    data: {
      refundStatus: "REQUESTED",
      refundRequestedAt: new Date(),
      refundPatientNote: params.note?.trim() || null,
    },
  });

  await notifyRefundRequested({
    patientId: purchase.userId,
    patientName: purchase.user.name,
    itemTitle: purchase.resource.title,
    itemKind: "RESOURCE",
    entityId: purchase.id,
  });

  revalidateRefundPaths(purchase.userId);
  return { ok: true };
}

export async function resolveAppointmentRefund(params: {
  appointmentId: string;
  approved: boolean;
  adminNote?: string;
}): Promise<RefundActionResult> {
  try {
    const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, message: "No autorizado." };
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: { payment: true, consultationType: true },
  });

  if (!appt?.payment) {
    return { ok: false, message: "Pago no encontrado." };
  }
  if (appt.payment.refundStatus !== "REQUESTED") {
    return { ok: false, message: "No hay solicitud de reembolso pendiente." };
  }

  const now = new Date();
  const adminNote = params.adminNote?.trim() || null;

  if (params.approved) {
    await prisma.payment.update({
      where: { id: appt.payment.id },
      data: {
        status: "REFUNDED",
        advanceStatus: "REFUNDED",
        remainderStatus: "REFUNDED",
        refundStatus: "APPROVED",
        refundAdminNote: adminNote,
        refundResolvedAt: now,
      },
    });
    if (["PENDING", "CONFIRMED"].includes(appt.status)) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: {
          status: "CANCELLED",
          cancelledBy: "ADMIN",
          cancelledAt: now,
        },
      });
    }
  } else {
    await prisma.payment.update({
      where: { id: appt.payment.id },
      data: {
        refundStatus: "DENIED",
        refundAdminNote: adminNote,
        refundResolvedAt: now,
      },
    });
  }

  await notifyRefundResolved({
    patientId: appt.patientId,
    itemTitle: appt.consultationType.name,
    approved: params.approved,
    adminNote,
  });

  revalidateRefundPaths(appt.patientId);
  return { ok: true };
  } catch (err) {
    console.error("[resolveAppointmentRefund]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo resolver el reembolso."),
    };
  }
}

export async function resolveResourceRefund(params: {
  purchaseId: string;
  approved: boolean;
  adminNote?: string;
}): Promise<RefundActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const purchase = await prisma.resourcePurchase.findUnique({
    where: { id: params.purchaseId },
    include: { resource: true },
  });

  if (!purchase) {
    return { ok: false, message: "Compra no encontrada." };
  }
  if (purchase.refundStatus !== "REQUESTED") {
    return { ok: false, message: "No hay solicitud de reembolso pendiente." };
  }

  const now = new Date();
  const adminNote = params.adminNote?.trim() || null;

  if (params.approved) {
    await prisma.resourcePurchase.update({
      where: { id: purchase.id },
      data: {
        status: "REFUNDED",
        refundStatus: "APPROVED",
        refundAdminNote: adminNote,
        refundResolvedAt: now,
      },
    });
  } else {
    await prisma.resourcePurchase.update({
      where: { id: purchase.id },
      data: {
        refundStatus: "DENIED",
        refundAdminNote: adminNote,
        refundResolvedAt: now,
      },
    });
  }

  await notifyRefundResolved({
    patientId: purchase.userId,
    itemTitle: purchase.resource.title,
    approved: params.approved,
    adminNote,
  });

  revalidateRefundPaths(purchase.userId);
  return { ok: true };
  } catch (err) {
    console.error("[resolveResourceRefund]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo resolver el reembolso."),
    };
  }
}
