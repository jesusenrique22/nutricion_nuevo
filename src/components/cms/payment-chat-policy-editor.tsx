"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  isTwoPhaseSplit,
  paymentSplitSummary,
  resolvePaymentSplit,
} from "@/lib/payment-policy-resolve";
import { updatePaymentChatPolicy } from "@/server/actions/cms.actions";
import type { ConsultationAdminDTO } from "@/server/actions/cms.actions";
import type {
  ConsultationPaymentRule,
  PaymentChatPolicy,
  PaymentSplitMode,
  SinglePaymentTiming,
} from "@/types/payment-chat-policy";
import { IntegerInput } from "@/components/ui/integer-input";

type ConsultationCode = ConsultationPaymentRule["consultationCode"];

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

function ruleForType(
  rules: ConsultationPaymentRule[],
  code: ConsultationCode,
): ConsultationPaymentRule {
  return (
    rules.find((r) => r.consultationCode === code) ?? {
      consultationCode: code,
      enabled: true,
      mode: "two_phase",
      advancePercent: 50,
      singleTiming: "on_booking",
    }
  );
}

function updateRule(
  rules: ConsultationPaymentRule[],
  code: ConsultationCode,
  patch: Partial<ConsultationPaymentRule>,
): ConsultationPaymentRule[] {
  const existing = ruleForType(rules, code);
  const next = { ...existing, ...patch, consultationCode: code };
  const others = rules.filter((r) => r.consultationCode !== code);
  return [...others, next].sort((a, b) =>
    a.consultationCode.localeCompare(b.consultationCode),
  );
}

export function PaymentChatPolicyEditor({
  initial,
  consultationTypes,
}: {
  initial: PaymentChatPolicy;
  consultationTypes: ConsultationAdminDTO[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState(initial.consultationRules);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewPolicy = useMemo(
    (): PaymentChatPolicy => ({
      consultationRules: rules,
      chatUnlockOnAppointment: false,
      chatUnlockOnAdvancePaid: false,
      chatUnlockOnRemainderPaid: false,
    }),
    [rules],
  );

  function patchRule(
    code: ConsultationCode,
    patch: Partial<ConsultationPaymentRule>,
  ) {
    setRules((current) => updateRule(current, code, patch));
  }

  return (
    <form
      className="rounded-2xl border border-foreground/10 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const res = await updatePaymentChatPolicy({
            consultationRules: rules,
            chatUnlockOnAppointment: false,
            chatUnlockOnAdvancePaid: false,
            chatUnlockOnRemainderPaid: false,
          });
          setMessage(res.ok ? "Política de pagos actualizada." : res.message);
          if (res.ok) router.refresh();
        });
      }}
    >
      <h3 className="text-lg font-bold">Pagos por tipo de consulta</h3>
      <p className="mt-1 text-sm text-foreground/60">
        Configura pago único o en dos etapas para cada servicio. Las citas nuevas
        usarán la regla del tipo reservado; las citas ya creadas mantienen su
        esquema original.
      </p>

      <div className="mt-6 space-y-4">
        {consultationTypes.map((type) => {
          const code = type.code as ConsultationCode;
          const rule = ruleForType(rules, code);
          const split = resolvePaymentSplit(previewPolicy, code);

          return (
            <div
              key={type.id}
              className="rounded-2xl border border-foreground/10 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-primary">{type.name}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) =>
                      patchRule(code, { enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-foreground/20"
                  />
                  <span className="font-semibold">Activo</span>
                </label>
              </div>

              {!rule.enabled ? (
                <p className="mt-3 text-sm text-foreground/55">
                  Sin regla personalizada: pago único al agendar (100%).
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-semibold">Modalidad</span>
                      <select
                        value={rule.mode}
                        onChange={(e) =>
                          patchRule(code, {
                            mode: e.target.value as PaymentSplitMode,
                          })
                        }
                        className={inputClass}
                      >
                        <option value="single">Pago único</option>
                        <option value="two_phase">Dos etapas</option>
                      </select>
                    </label>

                    {rule.mode === "single" ? (
                      <label className="block text-sm">
                        <span className="font-semibold">Cuándo se cobra</span>
                        <select
                          value={rule.singleTiming}
                          onChange={(e) =>
                            patchRule(code, {
                              singleTiming: e.target
                                .value as SinglePaymentTiming,
                            })
                          }
                          className={inputClass}
                        >
                          <option value="on_booking">Al agendar</option>
                          <option value="on_completion">
                            Al finalizar la consulta
                          </option>
                        </select>
                      </label>
                    ) : (
                      <label className="block text-sm">
                        <span className="font-semibold">Adelanto (%)</span>
                        <IntegerInput
                          min={1}
                          max={99}
                          emptyWhenZero={false}
                          value={rule.advancePercent}
                          onChange={(advancePercent) =>
                            patchRule(code, { advancePercent })
                          }
                          className={inputClass}
                          placeholder="50"
                        />
                        <span className="mt-1 block text-xs text-foreground/50">
                          Saldo: {100 - rule.advancePercent}%
                        </span>
                      </label>
                    )}
                  </div>

                  <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground/65">
                    {paymentSplitSummary(split)}
                    {isTwoPhaseSplit(split.advancePercent) && (
                      <>
                        {" "}
                        · Ej. consulta ${type.price}: adelanto $
                        {(
                          (Number(type.price) * split.advancePercent) /
                          100
                        ).toLocaleString("es-AR")}{" "}
                        · saldo $
                        {(
                          (Number(type.price) * split.remainderPercent) /
                          100
                        ).toLocaleString("es-AR")}
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        Guardar política de pagos
      </button>

      {message && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>
      )}
    </form>
  );
}
