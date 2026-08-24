/**
 * Zona horaria de la clínica. En Vercel el server es UTC; los horarios de agenda
 * deben interpretarse siempre en Buenos Aires, no con Date#getHours() local.
 */
export const CLINIC_TIMEZONE =
  process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() ||
  "America/Argentina/Buenos_Aires";

/** Argentina no usa DST desde 2009; offset fijo para construir instantes. */
const CLINIC_UTC_OFFSET = "-03:00";

/** YYYY-MM-DD en zona de la clínica. */
export function dateKeyInClinicTz(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: CLINIC_TIMEZONE });
}

/** Minutos desde medianoche (0–1439) en zona de la clínica. */
export function minutesInClinicTz(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  // en-GB a veces devuelve 24:00 → normalizar
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

/**
 * Interpreta fecha + HH:mm como hora local de la clínica y devuelve el Instant UTC.
 */
export function clinicDateTimeToUtc(dateStr: string, hhmm: string): Date {
  const time = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  return new Date(`${dateStr}T${time}${CLINIC_UTC_OFFSET}`);
}

export function clinicDateAtMinutes(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayOffset = Math.floor(minutes / (24 * 60));
  const mins = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const rolled = new Date(Date.UTC(y, m - 1, d + dayOffset));
  const yy = rolled.getUTCFullYear();
  const mm = String(rolled.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(rolled.getUTCDate()).padStart(2, "0");
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mi = String(mins % 60).padStart(2, "0");
  return clinicDateTimeToUtc(`${yy}-${mm}-${dd}`, `${hh}:${mi}`);
}

export function toMinutesHhmm(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Hoy YYYY-MM-DD según calendario de la clínica. */
export function clinicTodayDateKey(): string {
  return dateKeyInClinicTz(new Date());
}
