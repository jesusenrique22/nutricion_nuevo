import {
  ALL_CONSULTATION_CODES,
  defaultRuleForConsultation,
  parseConsultationPaymentRule,
} from "@/lib/payment-policy-resolve";
import {
  DEFAULT_PAYMENT_CHAT_POLICY,
  type ConsultationPaymentRule,
  type PaymentChatPolicy,
} from "@/types/payment-chat-policy";
import { withoutChatUnlock } from "@/lib/feature-flags";
import { getSiteContentBySlug } from "@/server/actions/cms.actions";
import { PAYMENT_CHAT_POLICY_SLUG } from "@/types/payment-chat-policy";

function clampPercent(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseConsultationRules(
  data: Record<string, unknown>,
  catalogCodes: string[],
): ConsultationPaymentRule[] {
  const legacyAdvance = clampPercent(
    data.advancePercent,
    DEFAULT_PAYMENT_CHAT_POLICY.consultationRules[0]?.advancePercent ?? 50,
  );

  const rawRules = data.consultationRules;
  if (!Array.isArray(rawRules)) {
    return catalogCodes.map((code) =>
      defaultRuleForConsultation(code, legacyAdvance),
    );
  }

  const parsed = rawRules
    .map(parseConsultationPaymentRule)
    .filter((r): r is ConsultationPaymentRule => r != null);

  return catalogCodes.map((code) => {
    const found = parsed.find((r) => r.consultationCode === code);
    return found ?? defaultRuleForConsultation(code, legacyAdvance);
  });
}

export function parsePaymentChatPolicy(
  data: Record<string, unknown> | null | undefined,
  catalogCodes: string[] = ALL_CONSULTATION_CODES,
): PaymentChatPolicy {
  if (!data) {
    return withoutChatUnlock({
      ...DEFAULT_PAYMENT_CHAT_POLICY,
      consultationRules: catalogCodes.map((code) =>
        defaultRuleForConsultation(
          code,
          DEFAULT_PAYMENT_CHAT_POLICY.consultationRules[0]?.advancePercent ?? 50,
        ),
      ),
    });
  }

  return withoutChatUnlock({
    consultationRules: parseConsultationRules(data, catalogCodes),
    chatUnlockOnAppointment: parseBool(
      data.chatUnlockOnAppointment,
      DEFAULT_PAYMENT_CHAT_POLICY.chatUnlockOnAppointment,
    ),
    chatUnlockOnAdvancePaid: parseBool(
      data.chatUnlockOnAdvancePaid,
      DEFAULT_PAYMENT_CHAT_POLICY.chatUnlockOnAdvancePaid,
    ),
    chatUnlockOnRemainderPaid: parseBool(
      data.chatUnlockOnRemainderPaid,
      DEFAULT_PAYMENT_CHAT_POLICY.chatUnlockOnRemainderPaid,
    ),
  });
}

export async function getPaymentChatPolicy(): Promise<PaymentChatPolicy> {
  const { prisma } = await import("@/server/db/prisma");
  const [row, types] = await Promise.all([
    getSiteContentBySlug(PAYMENT_CHAT_POLICY_SLUG),
    prisma.consultationType.findMany({
      where: { isPublished: true },
      select: { code: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
  ]);
  return parsePaymentChatPolicy(
    row?.data as Record<string, unknown> | undefined,
    types.map((t) => t.code),
  );
}

export function paymentChatPolicyToRecord(
  policy: PaymentChatPolicy,
): Record<string, unknown> {
  return {
    consultationRules: policy.consultationRules,
    chatUnlockOnAppointment: policy.chatUnlockOnAppointment,
    chatUnlockOnAdvancePaid: policy.chatUnlockOnAdvancePaid,
    chatUnlockOnRemainderPaid: policy.chatUnlockOnRemainderPaid,
  };
}
