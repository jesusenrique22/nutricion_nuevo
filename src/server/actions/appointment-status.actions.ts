"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import {
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from "@/lib/validators/appointment-status";
import { syncPatientAndAdmins } from "@/server/realtime/sync";
import {
  notifyAppointmentStatusChange,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
} from "@/server/services/appointment-notify.service";
import { formatActionError } from "@/lib/db-errors";
import { validateAppointmentSlot } from "@/server/services/scheduling.service";
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { appointmentRescheduledEmail } from "@/lib/email-messages";

async function refreshGoogleCalendar(appointmentId: string) {
  const { refreshAppointmentGoogleCalendar } = await import(
    "@/server/services/google-calendar-sync.service"
  );
  await refreshAppointmentGoogleCalendar(appointmentId);
}

export type StatusActionResult =
  | { ok: true }
  | { ok: false; message: string };

const MIN_CANCEL_HOURS = 2;
const MIN_RESCHEDULE_HOURS = 2;

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW", "PENDING"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: ["COMPLETED"],
};

async function revalidateAppointmentPaths(patientId: string) {
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath("/dashboard/admin/patients");
  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
  await syncPatientAndAdmins(patientId, "appointments");
}

async function loadAppointment(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { consultationType: true, payment: true, patient: true },
  });
}

export async function updateAppointmentStatus(
  formData: unknown,
): Promise<StatusActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = updateAppointmentStatusSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const appt = await loadAppointment(parsed.data.appointmentId);
    if (!appt) return { ok: false, message: "Cita no encontrada." };

    const allowed = ADMIN_TRANSITIONS[appt.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return {
        ok: false,
        message: `No puedes cambiar de ${appt.status} a ${parsed.data.status}.`,
      };
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes ?? appt.notes,
        ...(parsed.data.status === "CANCELLED"
          ? {
              cancelledBy: "ADMIN",
              cancelledAt: new Date(),
            }
          : {}),
      },
    });

    if (parsed.data.status === "CONFIRMED") {
      await notifyAppointmentStatusChange({
        patientId: appt.patientId,
        consultationName: appt.consultationType.name,
        startTime: appt.startTime,
        status: parsed.data.status,
        appointmentId: appt.id,
      });
    }

    if (parsed.data.status === "CANCELLED") {
      await notifyAppointmentCancelled({
        appointmentId: appt.id,
        patientId: appt.patientId,
        patientName: appt.patient.name,
        consultationName: appt.consultationType.name,
        startTime: appt.startTime,
        cancelledBy: "ADMIN",
      });
      await refreshGoogleCalendar(appt.id);
    } else {
      await refreshGoogleCalendar(appt.id);
    }

    await revalidateAppointmentPaths(appt.patientId);
    return { ok: true };
  } catch (err) {
    console.error("[updateAppointmentStatus]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo actualizar la cita."),
    };
  }
}

export async function cancelAppointment(
  formData: unknown,
): Promise<StatusActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "Debes iniciar sesión." };

    const parsed = cancelAppointmentSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const appt = await loadAppointment(parsed.data.appointmentId);
    if (!appt) return { ok: false, message: "Cita no encontrada." };

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = appt.patientId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { ok: false, message: "No autorizado." };
    }

    if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
      return { ok: false, message: "Esta cita ya no se puede cancelar." };
    }

    if (appt.startTime <= new Date()) {
      return { ok: false, message: "No puedes cancelar una cita pasada." };
    }

    if (!isAdmin) {
      const hoursUntil =
        (appt.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil < MIN_CANCEL_HOURS) {
        return {
          ok: false,
          message: `Solo puedes cancelar con al menos ${MIN_CANCEL_HOURS} horas de anticipación.`,
        };
      }
    }

    const cancelledBy = isAdmin ? ("ADMIN" as const) : ("PATIENT" as const);

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: "CANCELLED",
        cancelledBy,
        cancelledAt: new Date(),
      },
    });

    await notifyAppointmentCancelled({
      appointmentId: appt.id,
      patientId: appt.patientId,
      patientName: appt.patient.name,
      consultationName: appt.consultationType.name,
      startTime: appt.startTime,
      cancelledBy,
    });

    await refreshGoogleCalendar(appt.id);

    await revalidateAppointmentPaths(appt.patientId);
    return { ok: true };
  } catch (err) {
    console.error("[cancelAppointment]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo cancelar la cita."),
    };
  }
}

export async function rescheduleAppointment(
  formData: unknown,
): Promise<StatusActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, message: "Debes iniciar sesión." };

    const parsed = rescheduleAppointmentSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const appt = await loadAppointment(parsed.data.appointmentId);
    if (!appt) return { ok: false, message: "Cita no encontrada." };

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = appt.patientId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { ok: false, message: "No autorizado." };
    }

    if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
      return { ok: false, message: "Esta cita ya no se puede reagendar." };
    }

    if (appt.startTime <= new Date()) {
      return { ok: false, message: "No puedes reagendar una cita pasada." };
    }

    if (!isAdmin) {
      const hoursUntil =
        (appt.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil < MIN_RESCHEDULE_HOURS) {
        return {
          ok: false,
          message: `Solo puedes reagendar con al menos ${MIN_RESCHEDULE_HOURS} horas de anticipación.`,
        };
      }
    }

    const startTime = new Date(parsed.data.startTime);
    if (startTime <= new Date()) {
      return { ok: false, message: "El nuevo horario debe ser en el futuro." };
    }

    const validation = await validateAppointmentSlot({
      consultationType: appt.consultationType,
      startTime,
      modality: appt.modality,
      excludeAppointmentId: appt.id,
    });

    if (!validation.ok) {
      return { ok: false, message: validation.message };
    }

    const rescheduledBy = isAdmin ? ("ADMIN" as const) : ("PATIENT" as const);

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        startTime,
        endTime: validation.endTime,
        reminderSentAt: null,
      },
    });

    await notifyAppointmentRescheduled({
      patientId: appt.patientId,
      patientName: appt.patient.name,
      patientEmail: appt.patient.email,
      consultationName: appt.consultationType.name,
      newStartTime: startTime,
      appointmentId: appt.id,
      rescheduledBy,
    });

    if (
      appt.patient.email &&
      isEmailDeliveryConfigured() &&
      rescheduledBy === "ADMIN"
    ) {
      const msg = appointmentRescheduledEmail({
        name: appt.patient.name,
        consultationName: appt.consultationType.name,
        newStartTime: startTime,
        appointmentsUrl: absoluteUrl("/dashboard/patient/appointments"),
      });
      await sendEmail({
        to: appt.patient.email,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    }

    await refreshGoogleCalendar(appt.id);
    await revalidateAppointmentPaths(appt.patientId);
    return { ok: true };
  } catch (err) {
    console.error("[rescheduleAppointment]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo reagendar la cita."),
    };
  }
}
