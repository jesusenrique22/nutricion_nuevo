"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import {
  markPaymentPhaseSchema,
  markPaymentSchema,
} from "@/lib/validators/appointment-status";
import { syncOverallPaymentStatus } from "@/lib/payment-split";
import { syncPatientAndAdmins } from "@/server/realtime/sync";
import { notifyPaymentRegistered } from "@/server/services/appointment-notify.service";

export type PaymentActionResult =
  | { ok: true }
  | { ok: false; message: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

async function revalidatePaymentPaths(patientId: string) {
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/chat");
  await syncPatientAndAdmins(patientId, "appointments");
  await syncPatientAndAdmins(patientId, "chat");
}

async function applyPaymentPhase(
  formData: unknown,
  phase: "advance" | "remainder" | "full",
): Promise<PaymentActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "No autorizado." };

  const parsed = markPaymentPhaseSchema.safeParse({ ...(formData as object), phase });
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };

  const appt = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { payment: true, consultationType: true },
  });
  if (!appt?.payment) {
    return { ok: false, message: "No hay registro de pago para esta cita." };
  }

  const now = new Date();
  const note = parsed.data.adminNote;
  let advanceStatus = appt.payment.advanceStatus;
  let remainderStatus = appt.payment.remainderStatus;
  let advancePaidAt = appt.payment.advancePaidAt;
  let remainderPaidAt = appt.payment.remainderPaidAt;
  let advanceNote = appt.payment.advanceNote;
  let remainderNote = appt.payment.remainderNote;

  if (phase === "advance" || phase === "full") {
    advanceStatus = "PAID";
    advancePaidAt = now;
    if (note) advanceNote = note;
  }
  if (phase === "remainder" || phase === "full") {
    remainderStatus = "PAID";
    remainderPaidAt = now;
    if (note) remainderNote = note;
  }

  const status = syncOverallPaymentStatus(advanceStatus, remainderStatus);

  await prisma.payment.update({
    where: { id: appt.payment.id },
    data: {
      advanceStatus,
      remainderStatus,
      status,
      advancePaidAt,
      remainderPaidAt,
      advanceNote,
      remainderNote,
      paidAt: status === "PAID" ? now : appt.payment.paidAt,
      adminNote: note ?? appt.payment.adminNote,
    },
  });

  const phaseLabel =
    phase === "advance"
      ? "Adelanto"
      : phase === "remainder"
        ? "Saldo final"
        : "Pago completo";

  await notifyPaymentRegistered({
    patientId: appt.patientId,
    amount: appt.payment.amount.toString(),
    consultationName: `${appt.consultationType.name} (${phaseLabel})`,
    appointmentId: appt.id,
  });

  await revalidatePaymentPaths(appt.patientId);
  return { ok: true };
}

/** Registra adelanto pagado (ej. al agendar). */
export async function markAdvancePaid(
  formData: unknown,
): Promise<PaymentActionResult> {
  return applyPaymentPhase(formData, "advance");
}

/** Registra saldo final pagado (ej. al terminar la consulta). */
export async function markRemainderPaid(
  formData: unknown,
): Promise<PaymentActionResult> {
  return applyPaymentPhase(formData, "remainder");
}

/** Marca pago completo de una sola vez (compatibilidad). */
export async function markPaymentPaid(
  formData: unknown,
): Promise<PaymentActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "No autorizado." };

  const parsed = markPaymentSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };

  return applyPaymentPhase(
    { appointmentId: parsed.data.appointmentId, adminNote: parsed.data.adminNote },
    "full",
  );
}

export async function markPaymentRefunded(
  appointmentId: string,
): Promise<PaymentActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "No autorizado." };

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { patientId: true },
  });
  if (!appt) return { ok: false, message: "Cita no encontrada." };

  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
  });
  if (!payment) return { ok: false, message: "Pago no encontrado." };

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      advanceStatus: "REFUNDED",
      remainderStatus: "REFUNDED",
    },
  });

  await revalidatePaymentPaths(appt.patientId);
  return { ok: true };
}
