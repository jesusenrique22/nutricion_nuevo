import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";

function localDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: getGoogleCalendarConfig().timeZone,
  });
}

/** Solo citas de hoy en adelante (zona GOOGLE_CALENDAR_TIMEZONE). */
export function isAppointmentEligibleForGoogleSync(startTime: Date): boolean {
  return localDateKey(startTime) >= localDateKey(new Date());
}

/** Inicio del día local para filtros en BD (aprox. medianoche en la zona configurada). */
export function getCalendarSyncFromDate(): Date {
  const { timeZone } = getGoogleCalendarConfig();
  const todayYmd = localDateKey(new Date());
  let low = Date.now() - 48 * 3600_000;
  let high = Date.now() + 24 * 3600_000;

  while (high - low > 60_000) {
    const mid = Math.floor((low + high) / 2);
    const midYmd = new Date(mid).toLocaleDateString("en-CA", { timeZone });
    if (midYmd < todayYmd) low = mid;
    else high = mid;
  }

  return new Date(high);
}
