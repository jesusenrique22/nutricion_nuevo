export const CURRENCY_POLICY_SLUG = "currency_policy";

export interface CurrencyPolicy {
  markupPercent: number;
}

export const DEFAULT_CURRENCY_POLICY: CurrencyPolicy = {
  markupPercent: 5,
};
