import type {
  PaymentContactInfo,
  PaymentMethodId,
  PaymentMethodOption,
} from "@/types/payment-checkout-policy";
import { DEFAULT_PAYMENT_CHECKOUT_POLICY } from "@/types/payment-checkout-policy";

/** Valores por defecto — en runtime usar getPaymentCheckoutPolicy(). */
export const PAYMENT_CONTACT: PaymentContactInfo =
  DEFAULT_PAYMENT_CHECKOUT_POLICY.contact;

export const PAYMENT_METHODS: PaymentMethodOption[] =
  DEFAULT_PAYMENT_CHECKOUT_POLICY.methods;

export type { PaymentMethodId, PaymentMethodOption, PaymentContactInfo };

export function paymentMethodLabel(id: PaymentMethodId): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}
