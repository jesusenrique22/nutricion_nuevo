"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentChatPolicy } from "@/server/actions/cms.actions";
import type { PaymentChatPolicy } from "@/types/payment-chat-policy";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export function PaymentChatPolicyEditor({
  initial,
}: {
  initial: PaymentChatPolicy;
}) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remainderPreview = useMemo(
    () => 100 - policy.advancePercent,
    [policy.advancePercent],
  );

  return (
    <form
      className="rounded-2xl border border-foreground/10 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const res = await updatePaymentChatPolicy({
            ...policy,
            remainderPercent: 100 - policy.advancePercent,
          });
          setMessage(res.ok ? "Política actualizada." : res.message);
          if (res.ok) router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-bold">Pagos en dos etapas</h3>
      <p className="mt-1 text-sm text-foreground/60">
        Ejemplo: 50% de adelanto al agendar y 50% al finalizar la consulta.
        Los montos se calculan automáticamente al crear cada cita.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Adelanto (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={policy.advancePercent}
            onChange={(e) =>
              setPolicy((p) => ({
                ...p,
                advancePercent: Number(e.target.value),
                remainderPercent: 100 - Number(e.target.value),
              }))
            }
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Saldo al finalizar (%)</span>
          <input
            type="number"
            readOnly
            value={remainderPreview}
            className={`${inputClass} bg-muted/50`}
          />
        </label>
      </div>

      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-bold">¿Cuándo se habilita el chat?</h4>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={policy.chatUnlockOnAppointment}
            onChange={(e) =>
              setPolicy((p) => ({
                ...p,
                chatUnlockOnAppointment: e.target.checked,
              }))
            }
            className="mt-1"
          />
          <span>
            <strong>Al agendar cita</strong> del tipo (Nutrición, Entrenamiento
            o Antropometría).
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={policy.chatUnlockOnAdvancePaid}
            onChange={(e) =>
              setPolicy((p) => ({
                ...p,
                chatUnlockOnAdvancePaid: e.target.checked,
              }))
            }
            className="mt-1"
          />
          <span>
            <strong>Al registrar adelanto pagado</strong> (transferencia /
            efectivo manual).
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={policy.chatUnlockOnRemainderPaid}
            onChange={(e) =>
              setPolicy((p) => ({
                ...p,
                chatUnlockOnRemainderPaid: e.target.checked,
              }))
            }
            className="mt-1"
          />
          <span>
            <strong>Al registrar saldo final pagado</strong> (día de la
            consulta).
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        Guardar política
      </button>

      {message && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>
      )}
    </form>
  );
}
