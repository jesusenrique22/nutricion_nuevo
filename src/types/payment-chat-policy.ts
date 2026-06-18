import type { ConsultationCode } from "@/lib/consultation-codes";

export const PAYMENT_CHAT_POLICY_SLUG = "payment_chat_policy";

export type PaymentSplitMode = "single" | "two_phase";

/** Cuándo se cobra el pago único (modo single). */
export type SinglePaymentTiming = "on_booking" | "on_completion";

export interface ConsultationPaymentRule {
  consultationCode: ConsultationCode;
  /** Si está desactivado, se usa pago único al agendar por defecto. */
  enabled: boolean;
  mode: PaymentSplitMode;
  /** Porcentaje de adelanto (solo modo two_phase). */
  advancePercent: number;
  /** Momento del cobro (solo modo single). */
  singleTiming: SinglePaymentTiming;
}

export interface PaymentChatPolicy {
  consultationRules: ConsultationPaymentRule[];
  chatUnlockOnAppointment: boolean;
  chatUnlockOnAdvancePaid: boolean;
  chatUnlockOnRemainderPaid: boolean;
}

export interface ResolvedPaymentSplit {
  mode: PaymentSplitMode;
  advancePercent: number;
  remainderPercent: number;
  singleTiming?: SinglePaymentTiming;
}

export const DEFAULT_PAYMENT_CHAT_POLICY: PaymentChatPolicy = {
  consultationRules: [
    {
      consultationCode: "NUT_01",
      enabled: true,
      mode: "two_phase",
      advancePercent: 50,
      singleTiming: "on_booking",
    },
    {
      consultationCode: "ENT_02",
      enabled: true,
      mode: "two_phase",
      advancePercent: 50,
      singleTiming: "on_booking",
    },
    {
      consultationCode: "ANT_03",
      enabled: true,
      mode: "two_phase",
      advancePercent: 50,
      singleTiming: "on_booking",
    },
  ],
  chatUnlockOnAppointment: false,
  chatUnlockOnAdvancePaid: false,
  chatUnlockOnRemainderPaid: false,
};

export type ChatUnlockReason =
  | "appointment"
  | "advance_paid"
  | "remainder_paid"
  | "fully_paid"
  | "locked";

export interface ChatTypeEligibility {
  enabled: boolean;
  reason: ChatUnlockReason;
  unlockHint: string;
}
