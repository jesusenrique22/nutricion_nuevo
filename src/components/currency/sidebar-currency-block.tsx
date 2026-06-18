"use client";

import { CurrencySelector } from "@/components/currency/currency-selector";
import { useCurrency } from "@/contexts/currency-context";

function fmtArsRate(value: number): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function SidebarCurrencyBlock() {
  const { rates, ratesLoading, arsPerUsd } = useCurrency();

  return (
    <div
      className="rounded-xl border-2 border-accent-soft bg-surface p-3 shadow-lg shadow-black/20 ring-1 ring-white/30"
      role="region"
      aria-label="Selector de moneda"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        Moneda
      </p>
      <CurrencySelector variant="light" block className="mt-2" />
      {rates && !ratesLoading && arsPerUsd > 0 && (
        <p className="mt-2 rounded-lg bg-muted/60 px-2 py-1.5 text-[11px] font-semibold leading-snug text-primary">
          1 USD = ${fmtArsRate(arsPerUsd)} ARS
          <span className="mt-0.5 block text-[10px] font-normal text-foreground/55">
            Dólar blue · se actualiza una vez por día
          </span>
        </p>
      )}
    </div>
  );
}
