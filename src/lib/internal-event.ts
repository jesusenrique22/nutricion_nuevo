/**
 * Eventos de agenda internos: motivo, duraciones y enlaces "agregar a mi
 * calendario". Sin dependencias de servidor — lo usa tanto el panel como el
 * correo que se le manda al participante.
 */

export const INTERNAL_EVENT_KINDS = [
  "FOLLOW_UP",
  "EXTRA_CONSULT",
  "MEETING",
  "PERSONAL",
] as const;

export type InternalEventKind = (typeof INTERNAL_EVENT_KINDS)[number];

export const internalEventKindLabels: Record<InternalEventKind, string> = {
  FOLLOW_UP: "Seguimiento incluido en un pack",
  EXTRA_CONSULT: "Consulta adicional",
  MEETING: "Reunión o colaboración",
  PERSONAL: "Espacio propio",
};

/** Etiqueta corta para el calendario y los listados. */
export const internalEventKindShortLabels: Record<InternalEventKind, string> = {
  FOLLOW_UP: "Seguimiento",
  EXTRA_CONSULT: "Consulta extra",
  MEETING: "Reunión",
  PERSONAL: "Personal",
};

export function isInternalEventKind(value: string): value is InternalEventKind {
  return (INTERNAL_EVENT_KINDS as readonly string[]).includes(value);
}

export function internalEventKindLabel(value: string): string {
  return isInternalEventKind(value)
    ? internalEventKindLabels[value]
    : internalEventKindLabels.MEETING;
}

export const INTERNAL_EVENT_DURATIONS = [15, 30, 45, 60, 90, 120, 180] as const;

/** YYYYMMDDTHHmmssZ — formato de fecha que piden iCalendar y Google Calendar. */
export function toCalendarStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

export function googleCalendarTemplateUrl(event: {
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: Date;
  endTime: Date;
}): string {
  const params = [
    "action=TEMPLATE",
    `text=${encode(event.title)}`,
    `dates=${toCalendarStamp(event.startTime)}/${toCalendarStamp(event.endTime)}`,
  ];
  if (event.description?.trim()) {
    params.push(`details=${encode(event.description.trim())}`);
  }
  if (event.location?.trim()) {
    params.push(`location=${encode(event.location.trim())}`);
  }
  return `https://calendar.google.com/calendar/render?${params.join("&")}`;
}

export function outlookCalendarTemplateUrl(event: {
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: Date;
  endTime: Date;
}): string {
  const params = [
    "path=/calendar/action/compose",
    "rru=addevent",
    `subject=${encode(event.title)}`,
    `startdt=${event.startTime.toISOString()}`,
    `enddt=${event.endTime.toISOString()}`,
  ];
  if (event.description?.trim()) {
    params.push(`body=${encode(event.description.trim())}`);
  }
  if (event.location?.trim()) {
    params.push(`location=${encode(event.location.trim())}`);
  }
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.join("&")}`;
}

/** Escapa según RFC 5545: coma, punto y coma, barra y saltos de línea. */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Las líneas de un .ics no pueden pasar de 75 octetos. */
function foldIcsLine(line: string): string {
  if (line.length <= 73) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  return chunks.join("\r\n");
}

export function buildIcsFile(event: {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  organizerEmail: string;
  attendeeEmail?: string | null;
  cancelled?: boolean;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anttova//Agenda//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.cancelled ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT",
    `UID:${event.id}@anttova.com`,
    `DTSTAMP:${toCalendarStamp(new Date())}`,
    `DTSTART:${toCalendarStamp(event.startTime)}`,
    `DTEND:${toCalendarStamp(event.endTime)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `STATUS:${event.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `ORGANIZER;CN=${icsEscape(event.organizerName)}:mailto:${event.organizerEmail}`,
  ];

  if (event.description?.trim()) {
    lines.push(`DESCRIPTION:${icsEscape(event.description.trim())}`);
  }
  if (event.location?.trim()) {
    lines.push(`LOCATION:${icsEscape(event.location.trim())}`);
  }
  if (event.attendeeEmail) {
    lines.push(
      `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${event.attendeeEmail}`,
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n");
}
