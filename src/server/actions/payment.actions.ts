"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { markPaymentSchema } from "@/lib/validators/appointment-status";
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

async function revalidateAppointmentPaths(patientId: string) {
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard");
  await syncPatientAndAdmins(patientId, "appointments");
}

export async function markPaymentPaid(
  formData: unknown,
): Promise<PaymentActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "No autorizado." };

  const parsed = markPaymentSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };

  const appt = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { payment: true, consultationType: true },
  });
  if (!appt?.payment) {
    return { ok: false, message: "No hay registro de pago para esta cita." };
  }

  await prisma.payment.update({
    where: { id: appt.payment.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      adminNote: parsed.data.adminNote ?? appt.payment.adminNote,
    },
  });

  await notifyPaymentRegistered({
    patientId: appt.patientId,
    amount: appt.payment.amount.toString(),
    consultationName: appt.consultationType.name,
    appointmentId: appt.id,
  });

  await revalidateAppointmentPaths(appt.patientId);
  return { ok: true };
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
    data: { status: "REFUNDED" },
  });

  await revalidateAppointmentPaths(appt.patientId);
  return { ok: true };
}
