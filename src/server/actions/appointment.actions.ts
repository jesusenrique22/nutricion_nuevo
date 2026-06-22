"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertBookingRequestAllowed } from "@/lib/booking-guard";
import { prisma } from "@/server/db/prisma";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { validateAppointmentSlot } from "@/server/services/scheduling.service";
import { syncPatientAndAdmins } from "@/server/realtime/sync";
import { notifyAppointmentBooked } from "@/server/services/appointment-notify.service";
import { getPaymentChatPolicy } from "@/lib/payment-chat-policy";
import { buildPaymentCreateData } from "@/lib/payment-split";
import { resolveCalendarAdminIdForNewAppointment } from "@/lib/calendar-admin-resolve";

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string; flow: "INTAKE" | "FOLLOW_UP" }
  | { ok: false; message: string };

export async function createAppointment(
  formData: unknown,
): Promise<CreateAppointmentResult> {
  // 1) Autenticación
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }
  const patientId = session.user.id;

  const parsed = createAppointmentSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: "Datos de la cita inválidos." };
  }

  const guard = await assertBookingRequestAllowed(
    patientId,
    parsed.data.recaptchaToken,
  );
  if (!guard.ok) return guard;

  const { consultationTypeId, startTime, modality } = parsed.data;

  const consultationType = await prisma.consultationType.findUnique({
    where: { id: consultationTypeId },
  });
  if (!consultationType) {
    return { ok: false, message: "Tipo de consulta no encontrado." };
  }

  // 4) Reglas de negocio + cruce de horarios
  const validation = await validateAppointmentSlot({
    consultationType,
    startTime: new Date(startTime),
    modality,
  });
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  // 5) Detección de flujo: ¿primera cita (INTAKE) o seguimiento? (Módulo 1)
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: patientId },
    select: { hasCompletedIntake: true },
  });
  const flow = profile?.hasCompletedIntake ? "FOLLOW_UP" : "INTAKE";

  const calendarAdminId = await resolveCalendarAdminIdForNewAppointment();

  // 6) Persistencia + registro de pago manual pendiente (adelanto + saldo)
  const paymentPolicy = await getPaymentChatPolicy();

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        patientId,
        consultationTypeId,
        startTime: new Date(startTime),
        endTime: validation.endTime,
        modality,
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
          totalPrice: consultationType.price,
          consultationCode: consultationType.code,
          policy: paymentPolicy,
        }),
      },
    });

    return created;
  });

  await notifyAppointmentBooked({
    patientId,
    patientName: session.user.name ?? "Paciente",
    consultationName: consultationType.name,
    startTime: new Date(startTime),
    appointmentId: appointment.id,
  });

  const { syncAppointmentToGoogleCalendar } = await import(
    "@/server/services/google-calendar-sync.service"
  );
  void syncAppointmentToGoogleCalendar(appointment.id);

  revalidatePath("/dashboard/patient/appointments");

  await syncPatientAndAdmins(patientId, "appointments", {
    appointmentId: appointment.id,
  });

  return { ok: true, appointmentId: appointment.id, flow };
}
