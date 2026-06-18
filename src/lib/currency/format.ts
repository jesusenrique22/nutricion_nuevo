import type { SupportedCurrency } from "@/lib/currency/types";

const LOCALE_BY_CURRENCY: Record<SupportedCurrency, string> = {
  ARS: "es-AR",
  USD: "en-US",
};

export function formatMoney(
  amount: number,
  currency: SupportedCurrency,
  options?: { showCode?: boolean },
): string {
  if (!Number.isFinite(amount)) return "—";
  if (amount === 0) return "Gratis";

  const showCode = options?.showCode ?? true;
  const locale = LOCALE_BY_CURRENCY[currency];

  if (currency === "USD") {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    return showCode ? formatted : formatted.replace(/\s*USD$/, "");
  }

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return showCode ? `$${formatted} ARS` : `$${formatted}`;
}
