import { resolveCalendarAdminIdForNewAppointment } from "@/lib/calendar-admin-resolve";
import { isAppointmentEligibleForGoogleSync, getCalendarSyncFromDate } from "@/lib/google-calendar/sync-eligibility";
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

async function adminHasGoogleConnection(userId: string): Promise<boolean> {
  const row = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: { id: true },
  });
  return Boolean(row);
}

async function resolveAdminForAppointment(
  appointmentId: string,
  calendarAdminId: string | null,
): Promise<string | null> {
  if (calendarAdminId && (await adminHasGoogleConnection(calendarAdminId))) {
    return calendarAdminId;
  }

  const resolved = await resolveCalendarAdminIdForNewAppointment();
  if (resolved && (await adminHasGoogleConnection(resolved))) {
    if (calendarAdminId !== resolved) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { calendarAdminId: resolved },
      });
    }
    return resolved;
  }

  const fallback = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
      googleCalendarConnection: { isNot: null },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!fallback) return null;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { calendarAdminId: fallback.id },
  });
  return fallback.id;
}

/** Crea o actualiza el evento en Google Calendar para una cita. */
export async function syncAppointmentToGoogleCalendar(
  appointmentId: string,
): Promise<boolean> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        consultationType: true,
      },
    });
    if (!appt || appt.status === "CANCELLED") return false;

    if (!isAppointmentEligibleForGoogleSync(appt.startTime)) {
      return false;
    }

    const adminUserId = await resolveAdminForAppointment(
      appointmentId,
      appt.calendarAdminId,
    );
    if (!adminUserId) {
      console.warn(
        "[google-calendar/sync] sin admin con calendario conectado",
        appointmentId,
      );
      return false;
    }

    const payload = buildEventPayload(appt);

    if (appt.googleEventId) {
      await updateGoogleCalendarEvent(adminUserId, appt.googleEventId, payload);
      return true;
    }

    const eventId = await createGoogleCalendarEvent(adminUserId, payload);
    if (!eventId) {
      console.warn(
        "[google-calendar/sync] Google no devolvió eventId",
        appointmentId,
        adminUserId,
      );
      return false;
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { googleEventId: eventId, calendarAdminId: adminUserId },
    });
    return true;
  } catch (err) {
    console.error("[google-calendar/sync create]", appointmentId, err);
    return false;
  }
}

/** Sincroniza citas existentes que aún no tienen evento en Google Calendar. */
export async function syncUnsyncedAppointmentsForAdmin(
  adminUserId: string,
): Promise<{ synced: number; failed: number; alreadySynced: number }> {
  const hasConnection = await adminHasGoogleConnection(adminUserId);
  if (!hasConnection) {
    return { synced: 0, failed: 0, alreadySynced: 0 };
  }

  const since = getCalendarSyncFromDate();

  const alreadySynced = await prisma.appointment.count({
    where: {
      status: { not: "CANCELLED" },
      googleEventId: { not: null },
      startTime: { gte: since },
    },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { not: "CANCELLED" },
      googleEventId: null,
      startTime: { gte: since },
    },
    select: { id: true, startTime: true },
    orderBy: { startTime: "asc" },
  });

  let synced = 0;
  let failed = 0;

  for (const appt of appointments) {
    if (!isAppointmentEligibleForGoogleSync(appt.startTime)) {
      continue;
    }

    const ok = await syncAppointmentToGoogleCalendar(appt.id);
    if (ok) synced++;
    else failed++;
  }

  return { synced, failed, alreadySynced };
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
