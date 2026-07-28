import { clinicDateAtMinutes } from "@/lib/clinic-timezone";

/** Horario general de la clínica (consultas no matutinas). */
export const CLINIC_OPEN = "08:00";
export const CLINIC_CLOSE = "18:00";

export type BusyInterval = { start: string; end: string };

export type BookingAvailabilitySnapshot = {
  from: string;
  to: string;
  /** Fechas YYYY-MM-DD sin atención. */
  blockedDates: string[];
  /** Citas + bloques que ocupan agenda (ISO). */
  busy: BusyInterval[];
};

export type SlotComputeType = {
  durationMinutes: number;
  morningOnly: boolean;
  morningStart: string | null;
  morningEnd: string | null;
};

export type ComputedSlot = {
  start: string;
  end: string;
  label: string;
};

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Instant UTC para YYYY-MM-DD + minutos del día en zona de la clínica. */
export function dateAtMinutes(dateStr: string, minutes: number): Date {
  return clinicDateAtMinutes(dateStr, minutes);
}

export function windowForType(type: SlotComputeType): {
  start: number;
  end: number;
} {
  if (type.morningOnly) {
    return {
      start: toMinutes(type.morningStart ?? "08:00"),
      end: toMinutes(type.morningEnd ?? "12:00"),
    };
  }
  return {
    start: toMinutes(CLINIC_OPEN),
    end: toMinutes(CLINIC_CLOSE),
  };
}

/**
 * Genera slots en memoria a partir de ventana + duración + intervalos ocupados.
 * Sin I/O — usable en cliente y servidor.
 */
export function computeSlotsForDay(params: {
  dateStr: string;
  type: SlotComputeType;
  busy: BusyInterval[];
  blockedDates?: ReadonlySet<string> | readonly string[];
  now?: Date;
}): ComputedSlot[] {
  const { dateStr, type, busy, now = new Date() } = params;
  const blocked = params.blockedDates
    ? params.blockedDates instanceof Set
      ? params.blockedDates
      : new Set(params.blockedDates)
    : null;

  if (blocked?.has(dateStr)) return [];

  const { start: windowStart, end: windowEnd } = windowForType(type);
  const duration = type.durationMinutes;
  const dayStart = dateAtMinutes(dateStr, 0).getTime();
  const dayEnd = dateAtMinutes(dateStr, 24 * 60).getTime();

  const dayBusy = busy
    .map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))
    .filter((b) => b.start < dayEnd && b.end > dayStart);

  const slots: ComputedSlot[] = [];

  for (let t = windowStart; t + duration <= windowEnd; t += duration) {
    const start = dateAtMinutes(dateStr, t);
    const end = dateAtMinutes(dateStr, t + duration);
    const startMs = start.getTime();
    const endMs = end.getTime();

    if (start < now) continue;

    const overlaps = dayBusy.some((b) => b.start < endMs && b.end > startMs);
    if (overlaps) continue;

    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${hh}:${mm}`,
    });
  }

  return slots;
}

export function snapshotCoversDate(
  snapshot: BookingAvailabilitySnapshot,
  dateStr: string,
): boolean {
  return dateStr >= snapshot.from && dateStr <= snapshot.to;
}
