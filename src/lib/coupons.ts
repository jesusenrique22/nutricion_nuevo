export type CouponDuration =
  | "ONE_DAY"
  | "ONE_WEEK"
  | "ONE_MONTH"
  | "THREE_MONTHS"
  | "SIX_MONTHS"
  | "ONE_YEAR"
  | "PERMANENT";

export const COUPON_DURATION_OPTIONS: {
  value: CouponDuration;
  label: string;
}[] = [
  { value: "ONE_DAY", label: "1 día" },
  { value: "ONE_WEEK", label: "1 semana" },
  { value: "ONE_MONTH", label: "1 mes" },
  { value: "THREE_MONTHS", label: "3 meses" },
  { value: "SIX_MONTHS", label: "6 meses" },
  { value: "ONE_YEAR", label: "1 año" },
  { value: "PERMANENT", label: "Permanente" },
];

export const COUPON_DURATION_LABELS: Record<CouponDuration, string> =
  Object.fromEntries(
    COUPON_DURATION_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<CouponDuration, string>;

export function isCouponDuration(value: string): value is CouponDuration {
  return COUPON_DURATION_OPTIONS.some((o) => o.value === value);
}

/** Normaliza código: mayúsculas, sin espacios, solo A-Z 0-9 - _ */
export function normalizeCouponCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9\-_]/g, "");
}

export function isValidCouponCodeFormat(code: string): boolean {
  return /^[A-Z0-9\-_]{3,32}$/.test(code);
}

/** Código aleatorio legible (sin O/0/I/1). */
export function generateRandomCouponCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export function expiresAtFromDuration(
  duration: CouponDuration,
  from: Date = new Date(),
): Date | null {
  if (duration === "PERMANENT") return null;
  const d = new Date(from);
  switch (duration) {
    case "ONE_DAY":
      d.setDate(d.getDate() + 1);
      break;
    case "ONE_WEEK":
      d.setDate(d.getDate() + 7);
      break;
    case "ONE_MONTH":
      d.setMonth(d.getMonth() + 1);
      break;
    case "THREE_MONTHS":
      d.setMonth(d.getMonth() + 3);
      break;
    case "SIX_MONTHS":
      d.setMonth(d.getMonth() + 6);
      break;
    case "ONE_YEAR":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return d;
}

export function clampPercentOff(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export function isCouponCurrentlyValid(coupon: {
  active: boolean;
  startsAt: Date;
  expiresAt: Date | null;
}): boolean {
  if (!coupon.active) return false;
  const now = Date.now();
  if (coupon.startsAt.getTime() > now) return false;
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now) return false;
  return true;
}
