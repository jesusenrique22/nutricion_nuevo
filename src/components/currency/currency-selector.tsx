"use client";

import { useCurrency } from "@/contexts/currency-context";
import { CURRENCY_LABELS } from "@/lib/currency/constants";
import type { SupportedCurrency } from "@/lib/currency/types";

const selectClass =
  "rounded-full border border-foreground/15 bg-white px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 min-w-[9.5rem]";

export function CurrencySelector({
  variant = "light",
  block = false,
  className = "",
}: {
  variant?: "light" | "dark";
  block?: boolean;
  className?: string;
}) {
  const { displayCurrency, setDisplayCurrency, ratesLoading } = useCurrency();

  const darkSelect =
    variant === "dark"
      ? "border-white/25 bg-white/10 text-primary-foreground focus:ring-white/20"
      : selectClass;

  const labelClass = block
    ? `flex w-full flex-col items-stretch gap-1.5 ${className}`
    : `inline-flex items-center gap-2 ${className}`;

  return (
    <label className={labelClass}>
      <span className="sr-only">Moneda de visualización</span>
      <select
        value={displayCurrency}
        disabled={ratesLoading}
        onChange={(e) =>
          setDisplayCurrency(e.target.value as SupportedCurrency)
        }
        className={`${darkSelect} ${block ? "w-full" : ""}`}
        aria-label="Elegir moneda"
      >
        {(Object.keys(CURRENCY_LABELS) as SupportedCurrency[]).map((code) => (
          <option key={code} value={code}>
            {CURRENCY_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
