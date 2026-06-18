"use client";

import { useState, useTransition } from "react";
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
}: {
  initial: PaymentCheckoutPolicy;
}) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateMethod(
    id: PaymentMethodId,
    patch: Partial<(typeof policy.methods)[0]>,
  ) {
    setPolicy((p) => ({
      ...p,
      methods: p.methods.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }

  return (
    <form
      className="space-y-6 rounded-2xl border border-foreground/10 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const res = await updatePaymentCheckoutPolicy(policy);
          setMessage(
            res.ok
              ? "Configuración de checkout actualizada."
              : res.message,
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

      <div className="rounded-2xl border border-foreground/10 p-4">
        <h4 className="font-bold text-primary">Contacto</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold">Teléfono (visible)</span>
            <input
              className={inputClass}
              value={policy.contact.phone}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  contact: { ...p.contact, phone: e.target.value },
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Enlace teléfono</span>
            <input
              className={inputClass}
              value={policy.contact.phoneHref}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  contact: { ...p.contact, phoneHref: e.target.value },
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Instagram</span>
            <input
              className={inputClass}
              value={policy.contact.instagram}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  contact: { ...p.contact, instagram: e.target.value },
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">URL Instagram</span>
            <input
              className={inputClass}
              value={policy.contact.instagramHref}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  contact: { ...p.contact, instagramHref: e.target.value },
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Email</span>
            <input
              className={inputClass}
              value={policy.contact.email}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  contact: { ...p.contact, email: e.target.value },
                }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Enlace email</span>
            <input
              className={inputClass}
              value={policy.contact.emailHref}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  contact: { ...p.contact, emailHref: e.target.value },
                }))
              }
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-primary">Métodos de pago</h4>
        {policy.methods.map((method) => (
          <div
            key={method.id}
            className="rounded-2xl border border-foreground/10 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/45">
              {method.id}
            </p>
            <label className="mt-3 block text-sm">
              <span className="font-semibold">Nombre</span>
              <input
                className={inputClass}
                value={method.label}
                onChange={(e) =>
                  updateMethod(method.id, { label: e.target.value })
                }
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-semibold">Detalle / instrucciones</span>
              <textarea
                className={inputClass}
                rows={2}
                value={method.detail}
                onChange={(e) =>
                  updateMethod(method.id, { detail: e.target.value })
                }
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
            <input
              className={inputClass}
              value={policy.referenceLabel}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, referenceLabel: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Placeholder referencia</span>
            <input
              className={inputClass}
              value={policy.referencePlaceholder}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  referencePlaceholder: e.target.value,
                }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={policy.referenceRequired}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  referenceRequired: e.target.checked,
                }))
              }
            />
            Referencia obligatoria
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Etiqueta — captura</span>
            <input
              className={inputClass}
              value={policy.proofsLabel}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, proofsLabel: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-semibold">Ayuda — captura</span>
            <textarea
              className={inputClass}
              rows={2}
              value={policy.proofsHint}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, proofsHint: e.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={policy.showOptionalNote}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  showOptionalNote: e.target.checked,
                }))
              }
            />
            Mostrar nota adicional opcional
          </label>
          {policy.showOptionalNote && (
            <>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold">Etiqueta nota opcional</span>
                <input
                  className={inputClass}
                  value={policy.optionalNoteLabel}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      optionalNoteLabel: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold">Placeholder nota opcional</span>
                <input
                  className={inputClass}
                  value={policy.optionalNotePlaceholder}
                  onChange={(e) =>
                    setPolicy((p) => ({
                      ...p,
                      optionalNotePlaceholder: e.target.value,
                    }))
                  }
                />
              </label>
            </>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        Guardar checkout
      </button>

      {message && (
        <p className="text-sm text-foreground/70">{message}</p>
      )}
    </form>
  );
}
