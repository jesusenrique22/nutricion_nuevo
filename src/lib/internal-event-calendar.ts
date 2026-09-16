import {
  internalEventKindShortLabels,
  type InternalEventKind,
} from "@/lib/internal-event";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import type { InternalEventDTO } from "@/server/actions/internal-event.actions";

/** Prefijo que distingue un evento propio de una cita dentro del calendario. */
export const INTERNAL_EVENT_ID_PREFIX = "evt:";

export function isInternalEventCalendarId(id: string): boolean {
  return id.startsWith(INTERNAL_EVENT_ID_PREFIX);
}

export function internalEventIdFromCalendarId(id: string): string {
  return id.slice(INTERNAL_EVENT_ID_PREFIX.length);
}

/**
 * Adapta un evento propio a la forma que ya dibuja el calendario.
 *
 * Reusar AppointmentDTO evita duplicar las tres vistas (día/semana/mes); el
 * estado `INTERNAL` y el id prefijado bastan para pintarlo distinto y para
 * abrir el editor correcto al tocarlo.
 */
export function internalEventToCalendarEntry(
  event: InternalEventDTO,
): AppointmentDTO {
  const kindLabel =
    internalEventKindShortLabels[event.kind as InternalEventKind] ?? "Evento";
  const attendee = event.attendeeName || event.attendeeEmail;

  return {
    id: `${INTERNAL_EVENT_ID_PREFIX}${event.id}`,
    start: event.start,
    end: event.end,
    title: event.title,
    status: "INTERNAL",
    modality: event.modality,
    flow: "FOLLOW_UP",
    patientName: event.title,
    patientId: event.patientId ?? undefined,
    consultationName: attendee ? `${kindLabel} · ${attendee}` : kindLabel,
    paymentStatus: null,
    paymentPhases: null,
    notes: event.description,
  };
}
