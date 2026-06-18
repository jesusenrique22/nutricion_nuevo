"use client";

import { useCurrency, useCurrencyOptional } from "@/contexts/currency-context";
import { formatMoney } from "@/lib/currency/format";
import { parseMoneyAmount } from "@/lib/currency/convert";
import type { SupportedCurrency } from "@/lib/currency/types";

export function DisplayPrice({
  amount,
  currency = "ARS",
  className = "",
  freeLabel = "Gratis",
}: {
  amount: string | number | null | undefined;
  currency?: SupportedCurrency;
  className?: string;
  freeLabel?: string;
}) {
  const ctx = useCurrencyOptional();
  const value = parseMoneyAmount(amount ?? 0);

  if (value === 0) {
    return <span className={className}>{freeLabel}</span>;
  }

  if (!ctx) {
    return (
      <span className={className}>
        {formatMoney(value, currency === "USD" ? "USD" : "ARS")}
      </span>
    );
  }

  return (
    <span className={className}>{ctx.formatPrice(value, currency)}</span>
  );
}

/** Hook para totales u otros cálculos en componentes cliente. */
export function useDisplayPrice() {
  const { formatPrice, convert, displayCurrency, arsPerUsd } = useCurrency();
  return { formatPrice, convert, displayCurrency, arsPerUsd };
}
