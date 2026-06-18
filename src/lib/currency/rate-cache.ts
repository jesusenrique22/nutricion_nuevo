const RATE_TIMEZONE = "America/Argentina/Buenos_Aires";

/** Máximo antigüedad aceptable si la API falla (7 días). */
export const EXCHANGE_RATE_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function calendarDayKey(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RATE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestampMs));
}

/** true → conviene volver a consultar dolarapi.com (una vez por día calendario AR). */
export function isRateCacheStale(
  fetchedAt: string,
  nowMs: number = Date.now(),
): boolean {
  const fetchedMs = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetchedMs)) return true;
  if (nowMs - fetchedMs < 0) return true;

  return calendarDayKey(nowMs) !== calendarDayKey(fetchedMs);
}

export function isRateTooOldForFallback(
  fetchedAt: string,
  nowMs: number = Date.now(),
): boolean {
  const fetchedMs = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetchedMs)) return true;
  return nowMs - fetchedMs > EXCHANGE_RATE_MAX_STALE_MS;
}
