"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { arsToDisplayUsd } from "@/lib/currency/convert";
import {
  forceRefreshExchangeRate,
  updateCurrencyPolicy,
} from "@/server/actions/currency.actions";
import { useCurrency } from "@/contexts/currency-context";
import type { CurrencyPolicy } from "@/types/currency-policy";
import type { ExchangeRateSnapshot } from "@/lib/currency/types";
import { DecimalInput } from "@/components/ui/decimal-input";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/15 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

const EXAMPLE_ARS = 50_000;

export function CurrencyPolicyEditor({
  initial,
  initialRates,
}: {
  initial: CurrencyPolicy;
  initialRates: ExchangeRateSnapshot | null;
}) {
  const router = useRouter();
  const { syncRates, refreshRates, setPreviewMarkupPercent } = useCurrency();
  const [markupPercent, setMarkupPercent] = useState(initial.markupPercent);
  const [rates, setRates] = useState(initialRates);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function fmtRate(n: number | undefined) {
    if (!n) return "—";
    return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  }

  const previewUsdExample = useMemo(() => {
    if (!rates?.marketArsPerUsd) return null;
    const pct = Number.isFinite(markupPercent) ? markupPercent : 0;
    const baseUsd = EXAMPLE_ARS / rates.marketArsPerUsd;
    const withMarkup = arsToDisplayUsd(
      EXAMPLE_ARS,
      rates.marketArsPerUsd,
      pct,
    );
    return { baseUsd, withMarkup };
  }, [rates?.marketArsPerUsd, markupPercent]);

  function handleMarkupChange(value: number) {
    setMarkupPercent(value);
    setPreviewMarkupPercent(Number.isFinite(value) ? value : null);
  }

  function applySnapshotToApp(
    snapshot: ExchangeRateSnapshot | undefined,
  ) {
    if (snapshot) syncRates(snapshot);
    else void refreshRates();
  }

  const hasUnsavedPreview =
    Number.isFinite(markupPercent) && markupPercent !== rates?.markupPercent;

  return (
    <div className="space-y-4">
      <form
        className="rounded-2xl border border-foreground/10 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          startTransition(async () => {
            const res = await updateCurrencyPolicy({ markupPercent });
            if (!res.ok) {
              setMessage(res.message);
              return;
            }
            if (res.snapshot) {
              setRates(res.snapshot);
              applySnapshotToApp(res.snapshot);
            } else {
              applySnapshotToApp(undefined);
            }
            setMessage("Política de moneda actualizada en toda la plataforma.");
            router.refresh();
          });
        }}
      >
        <h3 className="text-lg font-bold text-primary">Cotización del dólar</h3>
        <p className="mt-1 text-sm text-foreground/60">
          La tasa se trae del <strong>dólar blue</strong> (dolarapi.com) y se
          actualiza sola <strong>una vez por día</strong> (Argentina), o a las
          8:00 en producción. No hace falta pulsar &quot;Actualizar tasa&quot;
          salvo que quieras forzarla al instante.
        </p>

        <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <label className="block text-sm">
            <span className="text-base font-bold text-primary">
              Recargo sobre el precio en USD (%)
            </span>
            <p className="mt-1 text-xs text-foreground/60">
              Cubre comisiones al mover el dinero entre bancos. Ejemplo: con
              blue a $1.470, $50.000 ARS equivalen a ~USD{" "}
              {previewUsdExample
                ? previewUsdExample.baseUsd.toLocaleString("es-AR", {
                    maximumFractionDigits: 2,
                  })
                : "34"}
              . Con un recargo del {Number.isFinite(markupPercent) ? markupPercent : 0}%
              el paciente ve ~USD{" "}
              {previewUsdExample
                ? previewUsdExample.withMarkup.toLocaleString("es-AR", {
                    maximumFractionDigits: 2,
                  })
                : "36"}
              .
            </p>
            <DecimalInput
              min={0}
              max={100}
              maxDecimals={1}
              value={markupPercent}
              onChange={handleMarkupChange}
              emptyWhenZero={false}
              className={`${inputClass} mt-2 text-lg font-semibold`}
              placeholder="0"
            />
          </label>
        </div>

        {rates && (
          <dl className="mt-5 grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-foreground/55">Dólar blue del día</dt>
              <dd className="font-semibold">
                ${fmtRate(rates.marketArsPerUsd)} ARS / USD
              </dd>
            </div>
            <div>
              <dt className="text-foreground/55">Recargo en precios USD</dt>
              <dd className="font-semibold text-primary">
                +{Number.isFinite(markupPercent) ? markupPercent : 0}%
                {hasUnsavedPreview && (
                  <span className="ml-1 text-xs font-normal text-foreground/50">
                    (vista previa)
                  </span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2 text-xs text-foreground/50">
              Dólar blue · Fuente: {rates.source} · Actualizado:{" "}
              {new Date(rates.fetchedAt).toLocaleString("es-AR")}
            </div>
          </dl>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Guardar cotización
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const res = await forceRefreshExchangeRate();
                if (!res.ok) {
                  setMessage(res.message);
                  return;
                }
                if (res.snapshot) {
                  setRates(res.snapshot);
                  applySnapshotToApp(res.snapshot);
                } else {
                  applySnapshotToApp(undefined);
                }
                setMessage("Cotización actualizada en toda la plataforma.");
                router.refresh();
              });
            }}
            className="rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Actualizar tasa ahora
          </button>
        </div>

        {message && (
          <p className="mt-4 text-sm text-foreground/70">{message}</p>
        )}
      </form>
    </div>
  );
}
