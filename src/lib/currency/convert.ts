import type { MoneyValue, SupportedCurrency, ExchangeRateSnapshot } from "@/lib/currency/types";

export function effectiveMarkupPercent(
  snapshot: Pick<ExchangeRateSnapshot, "markupPercent"> | null,
  previewMarkupPercent?: number | null,
): number {
  const raw = previewMarkupPercent ?? snapshot?.markupPercent ?? 0;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/** Tasa blue del día (1 USD = X ARS). */
export function displayArsPerUsd(
  snapshot: Pick<ExchangeRateSnapshot, "marketArsPerUsd" | "arsPerUsd"> | null,
): number {
  if (!snapshot) return 0;
  if (snapshot.marketArsPerUsd > 0) return snapshot.marketArsPerUsd;
  return snapshot.arsPerUsd > 0 ? snapshot.arsPerUsd : 0;
}

/** Precio en USD mostrado al paciente: mercado + recargo sobre el monto en dólares. */
export function arsToDisplayUsd(
  arsAmount: number,
  marketArsPerUsd: number,
  markupPercent: number,
): number {
  if (!Number.isFinite(arsAmount) || marketArsPerUsd <= 0) return 0;
  const baseUsd = arsAmount / marketArsPerUsd;
  const factor = 1 + Math.max(0, markupPercent) / 100;
  return Math.round(baseUsd * factor * 100) / 100;
}

/** Inverso de arsToDisplayUsd (USD mostrado → ARS base). */
export function displayUsdToArs(
  displayUsd: number,
  marketArsPerUsd: number,
  markupPercent: number,
): number {
  if (!Number.isFinite(displayUsd) || marketArsPerUsd <= 0) return 0;
  const factor = 1 + Math.max(0, markupPercent) / 100;
  const baseUsd = displayUsd / factor;
  return Math.round(baseUsd * marketArsPerUsd * 100) / 100;
}

export function convertAmount(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  marketArsPerUsd: number,
  markupPercent: number = 0,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  if (marketArsPerUsd <= 0) return amount;

  if (from === "ARS" && to === "USD") {
    return arsToDisplayUsd(amount, marketArsPerUsd, markupPercent);
  }
  if (from === "USD" && to === "ARS") {
    return displayUsdToArs(amount, marketArsPerUsd, markupPercent);
  }
  return amount;
}

export function convertMoney(
  value: MoneyValue,
  to: SupportedCurrency,
  marketArsPerUsd: number,
  markupPercent: number = 0,
): MoneyValue {
  return {
    amount: convertAmount(
      value.amount,
      value.currency,
      to,
      marketArsPerUsd,
      markupPercent,
    ),
    currency: to,
  };
}

export function parseMoneyAmount(
  raw: string | number | null | undefined,
): number {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (n == null || !Number.isFinite(n)) return 0;
  return n;
}
