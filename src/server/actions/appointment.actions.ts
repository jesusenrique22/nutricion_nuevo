"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertBookingRequestAllowed } from "@/lib/booking-guard";
import { prisma } from "@/server/db/prisma";
import { createAppointmentSchema, adminCreateAppointmentSchema } from "@/lib/validators/appointment";
import {
  assertNoOverlapInTransaction,
  validateAppointmentSlot,
} from "@/server/services/scheduling.service";
import { syncPatientAndAdmins } from "@/server/realtime/sync";
import { notifyAppointmentBooked } from "@/server/services/appointment-notify.service";
import { getPaymentChatPolicy } from "@/lib/payment-chat-policy";
import { buildPaymentCreateData } from "@/lib/payment-split";
import { resolveCalendarAdminIdForNewAppointment } from "@/lib/calendar-admin-resolve";
import {
  isTimeSlotConflictError,
  TIME_SLOT_TAKEN_MESSAGE,
} from "@/lib/scheduling-errors";
import { formatActionError } from "@/lib/db-errors";

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

  let appointment: { id: string };
  try {
    appointment = await prisma.$transaction(async (tx) => {
      await assertNoOverlapInTransaction(tx, {
        startTime: new Date(startTime),
        endTime: validation.endTime,
      });

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
  } catch (err) {
    if (isTimeSlotConflictError(err)) {
      return { ok: false, message: TIME_SLOT_TAKEN_MESSAGE };
    }
    console.error("[createAppointment]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo agendar la cita."),
    };
  }

  await notifyAppointmentBooked({
    patientId,
    patientName: session.user.name ?? "Paciente",
    consultationName: consultationType.name,
    startTime: new Date(startTime),
    appointmentId: appointment.id,
    // La cita se confirma recién cuando el admin aprueba el pago.
    awaitingPayment: consultationType.price.toNumber() > 0,
  });

  const { syncAppointmentToGoogleCalendar } = await import(
    "@/server/services/google-calendar-sync.service"
  );
  await syncAppointmentToGoogleCalendar(appointment.id);

  revalidatePath("/dashboard/patient/appointments");

  await syncPatientAndAdmins(patientId, "appointments", {
    appointmentId: appointment.id,
  });

  return { ok: true, appointmentId: appointment.id, flow };
}

export async function createAppointmentForPatient(
  formData: unknown,
): Promise<CreateAppointmentResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = adminCreateAppointmentSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: "Datos de la cita inválidos." };
  }

  const patient = await prisma.user.findFirst({
    where: { id: parsed.data.patientId, role: "PATIENT" },
    select: { id: true, name: true },
  });
  if (!patient) {
    return { ok: false, message: "Paciente no encontrado." };
  }

  const { consultationTypeId, startTime, modality, patientId } = parsed.data;

  const consultationType = await prisma.consultationType.findUnique({
    where: { id: consultationTypeId },
  });
  if (!consultationType) {
    return { ok: false, message: "Tipo de consulta no encontrado." };
  }

  const validation = await validateAppointmentSlot({
    consultationType,
    startTime: new Date(startTime),
    modality,
  });
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: patientId },
    select: { hasCompletedIntake: true },
  });
  const flow = profile?.hasCompletedIntake ? "FOLLOW_UP" : "INTAKE";

  const calendarAdminId = await resolveCalendarAdminIdForNewAppointment();
  const paymentPolicy = await getPaymentChatPolicy();

  let appointment: { id: string };
  try {
    appointment = await prisma.$transaction(async (tx) => {
      await assertNoOverlapInTransaction(tx, {
        startTime: new Date(startTime),
        endTime: validation.endTime,
      });

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
  } catch (err) {
    if (isTimeSlotConflictError(err)) {
      return { ok: false, message: TIME_SLOT_TAKEN_MESSAGE };
    }
    console.error("[createAppointmentForPatient]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo agendar la cita."),
    };
  }

  await notifyAppointmentBooked({
    patientId,
    patientName: patient.name,
    consultationName: consultationType.name,
    startTime: new Date(startTime),
    appointmentId: appointment.id,
  });

  const { syncAppointmentToGoogleCalendar } = await import(
    "@/server/services/google-calendar-sync.service"
  );
  await syncAppointmentToGoogleCalendar(appointment.id);

  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath(`/dashboard/admin/patients/${patientId}`);

  await syncPatientAndAdmins(patientId, "appointments", {
    appointmentId: appointment.id,
  });

  return { ok: true, appointmentId: appointment.id, flow };
}
