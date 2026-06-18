"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentCheckoutPolicy } from "@/server/actions/cms.actions";
import type {
  PaymentCheckoutPolicy,
  PaymentMethodId,
} from "@/types/payment-checkout-policy";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/15 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

export function PaymentCheckoutPolicyEditor({
  initial,
  onLiveChange,
}: {
  initial: PaymentCheckoutPolicy;
  onLiveChange?: (data: PaymentCheckoutPolicy) => void;
}) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function updateMethod(
    id: PaymentMethodId,
    patch: Partial<(typeof policy.methods)[0]>,
  ) {
    setPolicy((p) => {
      const next = { ...p, methods: p.methods.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
      onLiveChange?.(next);
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  function patch<K extends keyof PaymentCheckoutPolicy>(
    key: K,
    value: PaymentCheckoutPolicy[K],
  ) {
    setPolicy((p) => {
      const next = { ...p, [key]: value };
      onLiveChange?.(next);
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  useEffect(() => {
    if (message?.includes("actualizada")) {
      const t = setTimeout(() => {
        setMessage(null);
        setDirty(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  return (
    <form
      className="space-y-6 rounded-2xl border border-foreground/10 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const res = await updatePaymentCheckoutPolicy(policy);
          setMessage(
            res.ok ? "Configuración de checkout actualizada." : res.message,
          );
          if (res.ok) router.refresh();
        });
      }}
    >
      <div>
        <h3 className="text-lg font-bold">Checkout y comprobantes</h3>
        <p className="mt-1 text-sm text-foreground/60">
          Contacto, métodos de pago y textos que ve el paciente al confirmar su
          pedido en el carrito.
        </p>
      </div>

      {(dirty || message) && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm ${
            message
              ? message.includes("actualizada")
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-700"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <span className="font-semibold">
            {message ?? "Tenés cambios sin guardar."}
          </span>
          {dirty && !message && (
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-amber-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar ahora"}
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-foreground/10 p-4">
        <h4 className="font-bold text-primary">Contacto</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["phone", "Teléfono (visible)"],
              ["phoneHref", "Enlace teléfono"],
              ["instagram", "Instagram"],
              ["instagramHref", "URL Instagram"],
              ["email", "Email"],
              ["emailHref", "Enlace email"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="block text-sm">
              <span className="font-semibold">{label}</span>
              <input className={inputClass} value={policy.contact[field]}
                onChange={(e) => {
                  setPolicy((p) => {
                    const next = { ...p, contact: { ...p.contact, [field]: e.target.value } };
                    onLiveChange?.(next);
                    return next;
                  });
                  setDirty(true); setMessage(null);
                }} />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-primary">Métodos de pago</h4>
        {policy.methods.map((method) => (
          <div key={method.id} className="rounded-2xl border border-foreground/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/45">
              {method.id}
            </p>
            <label className="mt-3 block text-sm">
              <span className="font-semibold">Nombre</span>
              <input
                className={inputClass}
                value={method.label}
                onChange={(e) => updateMethod(method.id, { label: e.target.value })}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-semibold">Detalle / instrucciones</span>
              <textarea
                className={inputClass}
                rows={2}
                value={method.detail}
                onChange={(e) => updateMethod(method.id, { detail: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-foreground/10 p-4">
        <h4 className="font-bold text-primary">Campos del paciente</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Etiqueta — número de referencia</span>
            <input className={inputClass} value={policy.referenceLabel}
              onChange={(e) => patch("referenceLabel", e.target.value)} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Placeholder referencia</span>
            <input className={inputClass} value={policy.referencePlaceholder}
              onChange={(e) => patch("referencePlaceholder", e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={policy.referenceRequired}
              onChange={(e) => patch("referenceRequired", e.target.checked)} />
            Referencia obligatoria
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Etiqueta — captura</span>
            <input className={inputClass} value={policy.proofsLabel}
              onChange={(e) => patch("proofsLabel", e.target.value)} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Ayuda — captura</span>
            <textarea className={inputClass} rows={2} value={policy.proofsHint}
              onChange={(e) => patch("proofsHint", e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={policy.showOptionalNote}
              onChange={(e) => patch("showOptionalNote", e.target.checked)} />
            Mostrar nota adicional opcional
          </label>
          {policy.showOptionalNote && (
            <>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold">Etiqueta nota opcional</span>
                <input className={inputClass} value={policy.optionalNoteLabel}
                  onChange={(e) => patch("optionalNoteLabel", e.target.value)} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold">Placeholder nota opcional</span>
                <input className={inputClass} value={policy.optionalNotePlaceholder}
                  onChange={(e) => patch("optionalNotePlaceholder", e.target.value)} />
              </label>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !dirty}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {isPending ? "Guardando…" : "Guardar checkout"}
        </button>
        {!dirty && !message && (
          <span className="text-xs text-foreground/40">Sin cambios</span>
        )}
      </div>
    </form>
  );
}
