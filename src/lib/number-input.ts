/** Sanitiza texto mientras se escribe en un campo decimal. */
export function sanitizeDecimalInput(raw: string, maxDecimals = 2): string {
  let out = "";
  let sep = false;
  let decimals = 0;

  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (sep && decimals >= maxDecimals) continue;
      if (sep) decimals += 1;
      out += ch;
    } else if ((ch === "." || ch === ",") && !sep) {
      out += ch;
      sep = true;
    }
  }
  return out;
}

/** Parsea "35,50" / "35.5" / "35000" → número. Vacío → null. */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "." || trimmed === ",") return null;
  const normalized = trimmed.replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatDecimalForInput(
  value: number,
  emptyWhenZero = true,
): string {
  if (emptyWhenZero && value === 0) return "";
  return String(value);
}

export function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function parseIntegerInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

export function formatIntegerForInput(
  value: number,
  emptyWhenZero = true,
): string {
  if (emptyWhenZero && value === 0) return "";
  return String(value);
}

export function clampNumber(value: number, min?: number, max?: number): number {
  let n = value;
  if (min !== undefined) n = Math.max(min, n);
  if (max !== undefined) n = Math.min(max, n);
  return n;
}
