"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { PhoneField, emptyPhoneValue } from "@/components/ui/phone-field";
import { LoadingButton } from "@/components/ui/loading-button";
import { buildE164 } from "@/lib/phone-countries";
import { safeRouterRefresh } from "@/lib/safe-router";
import { updateMyPhone } from "@/server/actions/profile.actions";

const inputClass =
  "mt-2 rounded-xl border border-primary/20 bg-white px-3 py-3 text-base text-foreground outline-none transition focus:border-primary";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/60";

/**
 * Aviso emergente para pacientes que se registraron antes de que el teléfono
 * fuera obligatorio. No se puede cerrar: hay que completar el número.
 */
export function MissingPhoneGate() {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [phone, setPhone] = useState(emptyPhoneValue);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const phoneE164 = buildE164(phone.country, phone.number);
    if (!phoneE164) {
      setError("Ingresá un número de teléfono válido para el país elegido.");
      return;
    }

    setLoading(true);
    const res = await updateMyPhone({ phone: phoneE164 });
    setLoading(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }

    safeRouterRefresh(router);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div className="absolute inset-0 bg-primary/45 backdrop-blur-[3px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-primary/15"
      >
        <div className="bg-gradient-to-br from-primary/8 via-surface to-accent-soft/20 px-6 pt-6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/60">
            Anttova
          </p>
          <h2 id={titleId} className="mt-2 text-xl font-bold text-primary">
            Completá tu número de teléfono
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <p
            id={descriptionId}
            className="text-sm leading-relaxed text-foreground/75"
          >
            Para poder contactarte por tus citas y compras, necesitamos tu
            celular. Elegí tu país y escribí el número: se guarda en tu ficha.
          </p>

          <PhoneField
            value={phone}
            onChange={setPhone}
            disabled={loading}
            inputClassName={inputClass}
            labelClassName={labelClass}
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Guardando…"
            className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Guardar número
          </LoadingButton>
        </form>
      </div>
    </div>,
    document.body,
  );
}
