import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";

function localDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: getGoogleCalendarConfig().timeZone,
  });
}

/**
 * Solo citas cuyo día local (GOOGLE_CALENDAR_TIMEZONE) es hoy o futuro.
 * Las citas de días anteriores no se crean ni se actualizan en Google.
 */
export function isAppointmentEligibleForGoogleSync(startTime: Date): boolean {
  return localDateKey(startTime) >= localDateKey(new Date());
}

/** Medianoche local de “hoy” en la zona del calendario (para filtros Prisma). */
export function getCalendarSyncFromDate(now = new Date()): Date {
  const { timeZone } = getGoogleCalendarConfig();
  const todayYmd = localDateKey(now);
  // Buscar el instante UTC más temprano cuyo día local es todayYmd.
  let low = now.getTime() - 36 * 3600_000;
  let high = now.getTime() + 36 * 3600_000;

  while (high - low > 30_000) {
    const mid = Math.floor((low + high) / 2);
    const midYmd = new Date(mid).toLocaleDateString("en-CA", { timeZone });
    if (midYmd < todayYmd) low = mid;
    else high = mid;
  }

  return new Date(high);
}
