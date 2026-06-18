import { DOLLAR_QUOTE_TYPE } from "@/lib/currency/constants";
import {
  DEFAULT_CURRENCY_POLICY,
  type CurrencyPolicy,
} from "@/types/currency-policy";

export function parseCurrencyPolicy(data: unknown): CurrencyPolicy {
  if (!data || typeof data !== "object") return DEFAULT_CURRENCY_POLICY;
  const row = data as Record<string, unknown>;
  const markup =
    typeof row.markupPercent === "number"
      ? row.markupPercent
      : Number(row.markupPercent);
  return {
    markupPercent: Number.isFinite(markup)
      ? Math.min(100, Math.max(0, markup))
      : DEFAULT_CURRENCY_POLICY.markupPercent,
  };
}

export function currencyPolicyToRecord(
  policy: CurrencyPolicy,
): Record<string, unknown> {
  return {
    markupPercent: policy.markupPercent,
    dollarType: DOLLAR_QUOTE_TYPE,
  };
}
