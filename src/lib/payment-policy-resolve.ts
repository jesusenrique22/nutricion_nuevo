import type { ConsultationCode } from "@/lib/consultation-codes";
import type {
  ConsultationPaymentRule,
  PaymentChatPolicy,
  PaymentSplitMode,
  ResolvedPaymentSplit,
  SinglePaymentTiming,
} from "@/types/payment-chat-policy";

export const ALL_CONSULTATION_CODES: ConsultationCode[] = [
  "NUT_01",
  "ENT_02",
  "ANT_03",
];

function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function isTwoPhaseSplit(advancePercent: number): boolean {
  return advancePercent > 0 && advancePercent < 100;
}

export function defaultRuleForConsultation(
  consultationCode: ConsultationCode,
  legacyAdvancePercent = 50,
): ConsultationPaymentRule {
  const advance = clampPercent(legacyAdvancePercent, 50);

  if (advance >= 100) {
    return {
      consultationCode,
      enabled: true,
      mode: "single",
      advancePercent: 100,
      singleTiming: "on_booking",
    };
  }

  if (advance <= 0) {
    return {
      consultationCode,
      enabled: true,
      mode: "single",
      advancePercent: 0,
      singleTiming: "on_completion",
    };
  }

  return {
    consultationCode,
    enabled: true,
    mode: "two_phase",
    advancePercent: advance,
    singleTiming: "on_booking",
  };
}

export function resolvePaymentSplit(
  policy: PaymentChatPolicy,
  consultationCode: ConsultationCode,
): ResolvedPaymentSplit {
  const rule = policy.consultationRules.find(
    (r) => r.consultationCode === consultationCode,
  );

  if (!rule?.enabled) {
    return {
      mode: "single",
      advancePercent: 100,
      remainderPercent: 0,
      singleTiming: "on_booking",
    };
  }

  if (rule.mode === "single") {
    if (rule.singleTiming === "on_completion") {
      return {
        mode: "single",
        advancePercent: 0,
        remainderPercent: 100,
        singleTiming: "on_completion",
      };
    }
    return {
      mode: "single",
      advancePercent: 100,
      remainderPercent: 0,
      singleTiming: "on_booking",
    };
  }

  const advancePercent = clampPercent(rule.advancePercent, 50);
  return {
    mode: "two_phase",
    advancePercent,
    remainderPercent: 100 - advancePercent,
  };
}

export function paymentSplitSummary(split: ResolvedPaymentSplit): string {
  if (split.mode === "single") {
    return split.singleTiming === "on_completion"
      ? "Pago único al finalizar la consulta"
      : "Pago único al agendar";
  }
  return `Dos etapas: ${split.advancePercent}% adelanto · ${split.remainderPercent}% saldo`;
}

export function parseConsultationPaymentRule(
  raw: unknown,
): ConsultationPaymentRule | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const code = row.consultationCode;
  if (typeof code !== "string" || !code.trim()) return null;

  const mode: PaymentSplitMode =
    row.mode === "single" || row.mode === "two_phase" ? row.mode : "two_phase";

  const singleTiming: SinglePaymentTiming =
    row.singleTiming === "on_completion" ? "on_completion" : "on_booking";

  return {
    consultationCode: code,
    enabled: row.enabled !== false,
    mode,
    advancePercent: clampPercent(Number(row.advancePercent), 50),
    singleTiming,
  };
}

/** Asegura una regla de pago por cada paquete activo en catálogo. */
export function mergePaymentRulesForCatalog(
  policy: PaymentChatPolicy,
  catalogCodes: string[],
): PaymentChatPolicy {
  const byCode = new Map(
    policy.consultationRules.map((r) => [r.consultationCode, r] as const),
  );

  const consultationRules = catalogCodes.map((code) => {
    const existing = byCode.get(code);
    return existing ?? defaultRuleForConsultation(code);
  });

  return { ...policy, consultationRules };
}
