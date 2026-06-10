export const PAYMENT_CHAT_POLICY_SLUG = "payment_chat_policy";

export interface PaymentChatPolicy {
  /** Porcentaje de adelanto al agendar (ej. 50) */
  advancePercent: number;
  /** Porcentaje al finalizar la consulta (ej. 50) */
  remainderPercent: number;
  /** Habilitar chat al agendar cita de ese tipo */
  chatUnlockOnAppointment: boolean;
  /** Habilitar chat al registrar adelanto pagado */
  chatUnlockOnAdvancePaid: boolean;
  /** Habilitar chat al registrar saldo final pagado */
  chatUnlockOnRemainderPaid: boolean;
}

export const DEFAULT_PAYMENT_CHAT_POLICY: PaymentChatPolicy = {
  advancePercent: 50,
  remainderPercent: 50,
  chatUnlockOnAppointment: true,
  chatUnlockOnAdvancePaid: true,
  chatUnlockOnRemainderPaid: true,
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
