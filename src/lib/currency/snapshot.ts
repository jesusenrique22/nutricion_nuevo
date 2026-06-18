import { DOLLAR_QUOTE_TYPE } from "@/lib/currency/constants";
import type { ExchangeRateSnapshot, DollarQuoteType } from "@/lib/currency/types";
import { parseCurrencyPolicy } from "@/lib/currency-policy";

export type StoredRateRow = {
  marketArsPerUsd?: number;
  arsPerUsd?: number;
  markupPercent?: number;
  dollarType?: DollarQuoteType;
  fetchedAt?: string;
  source?: string;
};

export function snapshotFromStoredPolicy(
  policyData: Record<string, unknown> | null | undefined,
): ExchangeRateSnapshot | null {
  if (!policyData) return null;

  const stored = policyData as StoredRateRow;
  const policy = parseCurrencyPolicy(policyData);
  const market = stored.marketArsPerUsd ?? stored.arsPerUsd;

  if (!market || !Number.isFinite(market) || market <= 0) return null;
  if (!stored.fetchedAt) return null;

  return {
    marketArsPerUsd: market,
    arsPerUsd: market,
    markupPercent: policy.markupPercent,
    dollarType: DOLLAR_QUOTE_TYPE,
    fetchedAt: stored.fetchedAt,
    source: stored.source ?? "cache",
  };
}
