"use client";

import { useEffect, useState } from "react";
import { useCurrency, useCurrencyOptional } from "@/contexts/currency-context";
import { formatMoney } from "@/lib/currency/format";
import { parseMoneyAmount } from "@/lib/currency/convert";
import type { SupportedCurrency } from "@/lib/currency/types";

/**
 * Precio con conversión de moneda.
 * El primer paint siempre usa la moneda fuente (ARS) para coincidir con el SSR;
 * después de montar aplica la preferencia del usuario (p. ej. USD en localStorage).
 * Evita hydration mismatch con Suspense / streaming.
 */
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
  const [preferUserCurrency, setPreferUserCurrency] = useState(false);

  useEffect(() => {
    setPreferUserCurrency(true);
  }, []);

  if (value === 0) {
    return <span className={className}>{freeLabel}</span>;
  }

  const text =
    ctx && preferUserCurrency
      ? ctx.formatPrice(value, currency)
      : formatMoney(value, currency === "USD" ? "USD" : "ARS");

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}

/** Hook para totales u otros cálculos en componentes cliente. */
export function useDisplayPrice() {
  const { formatPrice, convert, displayCurrency, arsPerUsd } = useCurrency();
  return { formatPrice, convert, displayCurrency, arsPerUsd };
}
