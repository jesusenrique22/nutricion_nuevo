"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  COUPON_DURATION_LABELS,
  COUPON_DURATION_OPTIONS,
  formatMaxRedemptionsLabel,
  generateRandomCouponCode,
  normalizeCouponCode,
  type CouponDuration,
} from "@/lib/coupons";
import {
  createCoupon,
  deleteCoupon,
  updateCouponMaxRedemptions,
  type AdminCouponDTO,
} from "@/server/actions/coupon.actions";

const inputClass =
  "w-full rounded-xl border border-foreground/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";

function fmtDate(iso: string | null) {
  if (!iso) return "Sin vencimiento";
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maxRedemptionsToInput(max: number | null): string {
  return max === null ? "" : String(max);
}

function CouponMaxRedemptionsEditor({
  coupon,
  disabled,
  onSaved,
}: {
  coupon: AdminCouponDTO;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(maxRedemptionsToInput(coupon.maxRedemptions));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    setValue(maxRedemptionsToInput(coupon.maxRedemptions));
    setError(null);
  }, [coupon.id, coupon.maxRedemptions]);

  const dirty = value !== maxRedemptionsToInput(coupon.maxRedemptions);

  function handleSave() {
    setError(null);
    startSave(async () => {
      const res = await updateCouponMaxRedemptions({
        couponId: coupon.id,
        maxRedemptions: value,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      onSaved();
    });
  }

  return (
    <div className="mt-2 space-y-1.5">
      <label className="block text-xs text-foreground/55">
        Límite de canjes{" "}
        <span className="font-normal text-foreground/40">
          (vacío = ilimitado)
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-foreground/50">
          Canjes: {coupon.redemptionCount} /{" "}
          {formatMaxRedemptionsLabel(coupon.maxRedemptions)}
        </span>
        <input
          type="number"
          min={coupon.redemptionCount || 1}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ilimitado"
          disabled={disabled || isSaving}
          className="w-28 rounded-lg border border-foreground/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-50"
        />
        {dirty && (
          <button
            type="button"
            disabled={disabled || isSaving}
            onClick={handleSave}
            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
        )}
      </div>
      {coupon.isExhausted && (
        <p className="text-xs font-medium text-amber-700">
          Límite alcanzado — no acepta nuevos canjes hasta que subas el tope.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AdminCouponsPanel({ coupons }: { coupons: AdminCouponDTO[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [codeMode, setCodeMode] = useState<"custom" | "random">("custom");
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [duration, setDuration] = useState<CouponDuration>("ONE_MONTH");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  const available = useMemo(
    () => coupons.filter((c) => c.active && !c.isExpired),
    [coupons],
  );
  const expired = useMemo(
    () => coupons.filter((c) => c.active && c.isExpired),
    [coupons],
  );

  function handleGenerateRandom() {
    setCode(generateRandomCouponCode(8));
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLastCreated(null);

    startTransition(async () => {
      const res = await createCoupon({
        codeMode,
        code: codeMode === "custom" ? code : undefined,
        percentOff: Number(percentOff),
        duration,
        maxRedemptions,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setLastCreated(res.code ?? null);
      setCode("");
      setPercentOff("10");
      setDuration("ONE_MONTH");
      setMaxRedemptions("");
      router.refresh();
    });
  }

  function handleDelete(id: string, codeLabel: string) {
    if (
      !confirm(
        `¿Eliminar el cupón «${codeLabel}»? Ya no podrá usarse en nuevos pedidos.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteCoupon(id);
      if (!res.ok) alert(res.message);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-foreground/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
          Nuevo cupón
        </h2>
        <p className="mt-1 text-sm text-foreground/55">
          Creá un código escrito por vos o generá uno aleatorio. Elegí el % de
          descuento y por cuánto tiempo estará disponible.
        </p>

        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
              Código
            </legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setCodeMode("custom")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  codeMode === "custom"
                    ? "bg-primary text-primary-foreground"
                    : "border border-foreground/15 bg-white hover:bg-muted/40"
                }`}
              >
                Escrito por mí
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setCodeMode("random");
                  handleGenerateRandom();
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  codeMode === "random"
                    ? "bg-primary text-primary-foreground"
                    : "border border-foreground/15 bg-white hover:bg-muted/40"
                }`}
              >
                Aleatorio
              </button>
            </div>

            {codeMode === "custom" ? (
              <input
                value={code}
                onChange={(e) => setCode(normalizeCouponCode(e.target.value))}
                placeholder="Ej. VERANO25"
                maxLength={32}
                className={inputClass}
                required
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <input
                  value={code}
                  readOnly
                  className={`${inputClass} font-mono tracking-wider`}
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleGenerateRandom}
                  className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold hover:bg-muted/40 disabled:opacity-50"
                >
                  Regenerar
                </button>
              </div>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Descuento (%)
              </span>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
                className={inputClass}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Disponibilidad
              </span>
              <select
                value={duration}
                onChange={(e) =>
                  setDuration(e.target.value as CouponDuration)
                }
                className={inputClass}
              >
                {COUPON_DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Límite de canjes
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="Ilimitado"
                className={inputClass}
              />
            </label>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {lastCreated && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Cupón creado: <strong className="font-mono">{lastCreated}</strong>
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Creando…" : "Crear cupón"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
          Disponibles ({available.length})
        </h2>
        {available.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-foreground/15 bg-white px-6 py-10 text-center text-sm text-foreground/50">
            Todavía no hay cupones activos.
          </p>
        ) : (
          <ul className="space-y-3">
            {available.map((coupon) => (
              <li
                key={coupon.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-white px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="font-mono text-lg font-bold tracking-wide text-foreground">
                    {coupon.code}
                  </p>
                  <p className="mt-1 text-sm text-foreground/60">
                    {coupon.percentOff}% off ·{" "}
                    {COUPON_DURATION_LABELS[coupon.duration]} · vence{" "}
                    {fmtDate(coupon.expiresAt)}
                  </p>
                  <CouponMaxRedemptionsEditor
                    coupon={coupon}
                    disabled={isPending}
                    onSaved={() => router.refresh()}
                  />
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(coupon.id, coupon.code)}
                  className="rounded-full border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {expired.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/55">
            Vencidos ({expired.length})
          </h2>
          <ul className="space-y-3">
            {expired.map((coupon) => (
              <li
                key={coupon.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/8 bg-muted/20 px-4 py-4 opacity-80"
              >
                <div>
                  <p className="font-mono text-base font-semibold text-foreground/70">
                    {coupon.code}
                  </p>
                  <p className="text-sm text-foreground/50">
                    {coupon.percentOff}% · venció {fmtDate(coupon.expiresAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/45">
                    Canjes: {coupon.redemptionCount} /{" "}
                    {formatMaxRedemptionsLabel(coupon.maxRedemptions)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(coupon.id, coupon.code)}
                  className="rounded-full border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
