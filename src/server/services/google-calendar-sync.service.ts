import { resolveCalendarAdminIdForNewAppointment } from "@/lib/calendar-admin-resolve";
import { modalityLabels, appointmentStatusLabels } from "@/lib/appointment-labels";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/server/services/google-calendar.service";
import { prisma } from "@/server/db/prisma";

function buildEventPayload(appt: {
  status: string;
  flow: string;
  modality: string;
  startTime: Date;
  endTime: Date;
  patient: { name: string; email: string };
  consultationType: { name: string };
}) {
  const statusLabel =
    appointmentStatusLabels[appt.status] ?? appt.status;
  const modalityLabel = modalityLabels[appt.modality] ?? appt.modality;
  const flowLabel = appt.flow === "INTAKE" ? "Primera cita" : "Seguimiento";

  return {
    summary: `[Anttova] ${appt.consultationType.name} · ${appt.patient.name}`,
    description: [
      `Paciente: ${appt.patient.name}`,
      `Email: ${appt.patient.email}`,
      `Estado: ${statusLabel}`,
      `Modalidad: ${modalityLabel}`,
      `Tipo: ${flowLabel}`,
      "",
      "Creado desde Anttova.",
    ].join("\n"),
    startTime: appt.startTime,
    endTime: appt.endTime,
  };
}

async function resolveAdminForAppointment(
  appointmentId: string,
  calendarAdminId: string | null,
): Promise<string | null> {
  if (calendarAdminId) return calendarAdminId;

  const resolved = await resolveCalendarAdminIdForNewAppointment();
  if (!resolved) return null;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { calendarAdminId: resolved },
  });
  return resolved;
}

/** Crea o actualiza el evento en Google Calendar para una cita. */
export async function syncAppointmentToGoogleCalendar(
  appointmentId: string,
): Promise<void> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        consultationType: true,
      },
    });
    if (!appt || appt.status === "CANCELLED") return;

    const adminUserId = await resolveAdminForAppointment(
      appointmentId,
      appt.calendarAdminId,
    );
    if (!adminUserId) return;

    const payload = buildEventPayload(appt);

    if (appt.googleEventId) {
      await updateGoogleCalendarEvent(adminUserId, appt.googleEventId, payload);
      return;
    }

    const eventId = await createGoogleCalendarEvent(adminUserId, payload);
    if (eventId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: eventId, calendarAdminId: adminUserId },
      });
    }
  } catch (err) {
    console.error("[google-calendar/sync create]", err);
  }
}

/** Elimina el evento de Google al cancelar. */
export async function removeAppointmentFromGoogleCalendar(
  appointmentId: string,
): Promise<void> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { googleEventId: true, calendarAdminId: true },
    });
    if (!appt?.googleEventId || !appt.calendarAdminId) return;

    await deleteGoogleCalendarEvent(appt.calendarAdminId, appt.googleEventId);
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { googleEventId: null },
    });
  } catch (err) {
    console.error("[google-calendar/sync delete]", err);
  }
}

/** Refresca título/descripción si cambia el estado (confirmada, completada, etc.). */
export async function refreshAppointmentGoogleCalendar(
  appointmentId: string,
): Promise<void> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, consultationType: true },
    });
    if (!appt) return;

    if (appt.status === "CANCELLED") {
      await removeAppointmentFromGoogleCalendar(appointmentId);
      return;
    }

    await syncAppointmentToGoogleCalendar(appointmentId);
  } catch (err) {
    console.error("[google-calendar/sync refresh]", err);
  }
}
