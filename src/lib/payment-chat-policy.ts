import {
  DEFAULT_PAYMENT_CHAT_POLICY,
  type PaymentChatPolicy,
} from "@/types/payment-chat-policy";
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

export function parsePaymentChatPolicy(
  data: Record<string, unknown> | null | undefined,
): PaymentChatPolicy {
  if (!data) return DEFAULT_PAYMENT_CHAT_POLICY;

  const advancePercent = clampPercent(
    data.advancePercent,
    DEFAULT_PAYMENT_CHAT_POLICY.advancePercent,
  );
  let remainderPercent = clampPercent(
    data.remainderPercent,
    DEFAULT_PAYMENT_CHAT_POLICY.remainderPercent,
  );

  if (advancePercent + remainderPercent !== 100) {
    remainderPercent = 100 - advancePercent;
  }

  return {
    advancePercent,
    remainderPercent,
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
  };
}

export async function getPaymentChatPolicy(): Promise<PaymentChatPolicy> {
  const row = await getSiteContentBySlug(PAYMENT_CHAT_POLICY_SLUG);
  return parsePaymentChatPolicy(row?.data);
}

export function paymentChatPolicyToRecord(
  policy: PaymentChatPolicy,
): Record<string, unknown> {
  return { ...policy };
}
