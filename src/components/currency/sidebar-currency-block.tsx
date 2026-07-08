"use client";

import { useState } from "react";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { useCurrency } from "@/contexts/currency-context";
import { CURRENCY_LABELS } from "@/lib/currency/constants";

function fmtArsRate(value: number): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function SidebarCurrencyBlock() {
  const [open, setOpen] = useState(false);
  const { displayCurrency, rates, ratesLoading, arsPerUsd } = useCurrency();
  const panelId = "sidebar-currency-panel";

  return (
    <div
      className="rounded-xl border-2 border-accent-soft bg-surface shadow-lg shadow-black/20 ring-1 ring-white/30"
      role="region"
      aria-label="Selector de moneda"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/40"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Moneda
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-foreground/80">
            {CURRENCY_LABELS[displayCurrency]}
          </span>
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div id={panelId} className="border-t border-foreground/10 px-3 pb-3 pt-2">
          <CurrencySelector variant="light" block />
          {rates && !ratesLoading && arsPerUsd > 0 && (
            <p className="mt-2 rounded-lg bg-muted/60 px-2 py-1.5 text-[11px] font-semibold leading-snug text-primary">
              1 USD = ${fmtArsRate(arsPerUsd)} ARS
              <span className="mt-0.5 block text-[10px] font-normal text-foreground/55">
                Dólar blue · se actualiza una vez por día
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
