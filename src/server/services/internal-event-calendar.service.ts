/**
 * Sincroniza los eventos de agenda internos con el Google Calendar de Anttova.
 *
 * Va aparte de google-calendar-sync.service porque un evento interno no es una
 * Appointment: puede no tener paciente, no tiene estado de cita y su invitado
 * puede ser alguien sin cuenta en la plataforma.
 */
import { resolveCalendarAdminIdForNewAppointment } from "@/lib/calendar-admin-resolve";
import { isAppointmentEligibleForGoogleSync } from "@/lib/google-calendar/sync-eligibility";
import { modalityLabels } from "@/lib/appointment-labels";
import { internalEventKindLabel } from "@/lib/internal-event";
import { CLINIC_NOTIFICATION_EMAIL } from "@/lib/admin-users";
import type { CalendarEventInput } from "@/server/services/google-calendar-api";
import { prisma } from "@/server/db/prisma";

async function calendarApi() {
  return import("@/server/services/google-calendar-api");
}

async function adminHasGoogleConnection(userId: string): Promise<boolean> {
  const row = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: { id: true },
  });
  return Boolean(row);
}

async function resolveAdminForEvent(
  eventId: string,
  calendarAdminId: string | null,
): Promise<string | null> {
  if (calendarAdminId && (await adminHasGoogleConnection(calendarAdminId))) {
    return calendarAdminId;
  }

  const resolved = await resolveCalendarAdminIdForNewAppointment();
  if (resolved && (await adminHasGoogleConnection(resolved))) {
    if (calendarAdminId !== resolved) {
      await prisma.internalEvent.update({
        where: { id: eventId },
        data: { calendarAdminId: resolved },
      });
    }
    return resolved;
  }

  const fallback = await prisma.user.findFirst({
    where: { role: "ADMIN", googleCalendarConnection: { isNot: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!fallback) return null;

  await prisma.internalEvent.update({
    where: { id: eventId },
    data: { calendarAdminId: fallback.id },
  });
  return fallback.id;
}

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  startTime: Date;
  endTime: Date;
  modality: string;
  location: string | null;
  guestName: string | null;
  guestEmail: string | null;
  patient: { name: string; email: string } | null;
};

function buildEventPayload(event: EventRow): CalendarEventInput {
  const attendeeName = event.patient?.name ?? event.guestName ?? null;
  const attendeeEmail = event.patient?.email ?? event.guestEmail ?? null;

  // La nutricionista va primero como invitada, igual que en las citas: sin
  // esto Google no le mandaba la invitación y el evento le pasaba inadvertido.
  const attendees: Array<{ email: string; displayName?: string }> = [
    {
      email: CLINIC_NOTIFICATION_EMAIL,
      displayName: "Lic. Ma Antonieta Lanza",
    },
  ];
  if (
    attendeeEmail &&
    attendeeEmail.toLowerCase() !== CLINIC_NOTIFICATION_EMAIL.toLowerCase()
  ) {
    attendees.push({
      email: attendeeEmail,
      ...(attendeeName ? { displayName: attendeeName } : {}),
    });
  }

  const description = [
    `Motivo: ${internalEventKindLabel(event.kind)}`,
    attendeeName ? `Participa: ${attendeeName}` : null,
    attendeeEmail ? `Email: ${attendeeEmail}` : null,
    `Modalidad: ${modalityLabels[event.modality] ?? event.modality}`,
    event.location?.trim() ? `Lugar: ${event.location.trim()}` : null,
    event.description?.trim() ? `\n${event.description.trim()}` : null,
    "",
    "Evento de agenda creado desde Anttova (sin reserva pública).",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    summary: `[Anttova] ${event.title}`,
    description,
    startTime: event.startTime,
    endTime: event.endTime,
    attendees,
    isOnline: event.modality === "ONLINE",
  };
}

/**
 * Resultado de la sincronización.
 *
 * Antes devolvía un boolean que nadie miraba: si el evento no llegaba a Google
 * Calendar, la nutricionista no se enteraba de nada.
 */
export type InternalEventSyncResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Crea o actualiza el evento en el calendario de la nutricionista. */
export async function syncInternalEventToGoogleCalendar(
  eventId: string,
): Promise<InternalEventSyncResult> {
  try {
    const event = await prisma.internalEvent.findUnique({
      where: { id: eventId },
      include: { patient: { select: { name: true, email: true } } },
    });
    if (!event || event.cancelledAt) {
      return { ok: false, reason: "El evento ya no está activo." };
    }

    if (!isAppointmentEligibleForGoogleSync(event.startTime)) {
      return {
        ok: false,
        reason:
          "La fecha ya pasó, así que no se agregó a Google Calendar. El evento igual quedó en tu agenda de Anttova.",
      };
    }

    const adminUserId = await resolveAdminForEvent(
      eventId,
      event.calendarAdminId,
    );
    if (!adminUserId) {
      return {
        ok: false,
        reason:
          "No hay ningún calendario de Google conectado. Conectalo desde el calendario para que los eventos te aparezcan ahí.",
      };
    }

    const api = await calendarApi();
    const payload = buildEventPayload(event);

    if (event.googleEventId) {
      await api.updateGoogleCalendarEvent(
        adminUserId,
        event.googleEventId,
        payload,
      );
      return { ok: true };
    }

    const googleEventId = await api.createGoogleCalendarEvent(
      adminUserId,
      payload,
    );
    if (!googleEventId) {
      return {
        ok: false,
        reason: "Google no confirmó la creación del evento. Reintentá.",
      };
    }

    await prisma.internalEvent.update({
      where: { id: eventId },
      data: { googleEventId, calendarAdminId: adminUserId },
    });
    return { ok: true };
  } catch (err) {
    console.error("[internal-event/calendar sync]", eventId, err);
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: `Google Calendar rechazó el evento (${message.slice(0, 120)}).`,
    };
  }
}

/** Quita el evento de Google al cancelarlo o eliminarlo. */
export async function removeInternalEventFromGoogleCalendar(
  eventId: string,
): Promise<void> {
  try {
    const event = await prisma.internalEvent.findUnique({
      where: { id: eventId },
      select: { googleEventId: true, calendarAdminId: true },
    });
    if (!event?.googleEventId || !event.calendarAdminId) return;

    const api = await calendarApi();
    await api.deleteGoogleCalendarEvent(
      event.calendarAdminId,
      event.googleEventId,
    );
    await prisma.internalEvent.update({
      where: { id: eventId },
      data: { googleEventId: null },
    });
  } catch (err) {
    console.error("[internal-event/calendar delete]", eventId, err);
  }
}
