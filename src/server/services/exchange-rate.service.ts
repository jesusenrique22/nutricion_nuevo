import {
  DOLLAR_QUOTE_TYPE,
} from "@/lib/currency/constants";
import {
  isRateCacheStale,
  isRateTooOldForFallback,
} from "@/lib/currency/rate-cache";
import { snapshotFromStoredPolicy } from "@/lib/currency/snapshot";
import {
  currencyPolicyToRecord,
  parseCurrencyPolicy,
} from "@/lib/currency-policy";
import type { ExchangeRateSnapshot, DollarQuoteType } from "@/lib/currency/types";
import { CURRENCY_POLICY_SLUG } from "@/types/currency-policy";
import { Prisma } from "@prisma/client";
import { getSiteContentBySlug } from "@/server/actions/cms.actions";
import { prisma } from "@/server/db/prisma";

const DOLLAR_API_BASE = "https://dolarapi.com/v1/dolares";

type CachedRateRow = {
  marketArsPerUsd?: number;
  arsPerUsd?: number;
  markupPercent?: number;
  dollarType?: DollarQuoteType | string;
  fetchedAt?: string;
  source?: string;
};

function isBlueCache(row: Record<string, unknown> | undefined): boolean {
  if (!row) return true;
  const type = row.dollarType;
  return type == null || type === DOLLAR_QUOTE_TYPE;
}

async function fetchMarketRate(): Promise<{ rate: number; source: string }> {
  const res = await fetch(`${DOLLAR_API_BASE}/${DOLLAR_QUOTE_TYPE}`, {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`No se pudo obtener la cotización (${res.status}).`);
  }

  const json = (await res.json()) as { venta?: number; compra?: number };
  const rate = json.venta ?? json.compra;
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Cotización del dólar inválida.");
  }

  return { rate, source: `dolarapi.com/${DOLLAR_QUOTE_TYPE}` };
}

function readCachedSnapshot(
  policyData: Record<string, unknown>,
): ExchangeRateSnapshot | null {
  const snapshot = snapshotFromStoredPolicy(policyData);
  if (!snapshot) return null;
  if (isRateCacheStale(snapshot.fetchedAt)) return null;
  return snapshot;
}

function readFallbackSnapshot(
  policyData: Record<string, unknown>,
): ExchangeRateSnapshot | null {
  const snapshot = snapshotFromStoredPolicy(policyData);
  if (!snapshot) return null;
  if (isRateTooOldForFallback(snapshot.fetchedAt)) return null;
  return snapshot;
}

/** Aplica el recargo guardado; refresca mercado si el cache del día venció. */
export async function recomputeExchangeRateFromPolicy(): Promise<ExchangeRateSnapshot> {
  const row = await getSiteContentBySlug(CURRENCY_POLICY_SLUG);
  const policy = parseCurrencyPolicy(row?.data);
  const rowData = row?.data as Record<string, unknown> | undefined;

  const fromStored = snapshotFromStoredPolicy(rowData);
  if (
    fromStored &&
    isBlueCache(rowData) &&
    !isRateCacheStale(fromStored.fetchedAt)
  ) {
    const updated: ExchangeRateSnapshot = {
      ...fromStored,
      markupPercent: policy.markupPercent,
    };
    await persistSnapshot(policy, updated);
    return updated;
  }

  return getExchangeRateSnapshot({ forceRefresh: true });
}

async function persistSnapshot(
  policy: ReturnType<typeof parseCurrencyPolicy>,
  snapshot: ExchangeRateSnapshot,
) {
  const data = {
    ...currencyPolicyToRecord(policy),
    marketArsPerUsd: snapshot.marketArsPerUsd,
    arsPerUsd: snapshot.marketArsPerUsd,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
  };

  await prisma.siteContent.upsert({
    where: { slug: CURRENCY_POLICY_SLUG },
    create: {
      slug: CURRENCY_POLICY_SLUG,
      title: "Cotización y monedas",
      data: data as Prisma.InputJsonValue,
    },
    update: { data: data as Prisma.InputJsonValue },
  });
}

export async function getExchangeRateSnapshot(
  options: { forceRefresh?: boolean } = {},
): Promise<ExchangeRateSnapshot> {
  const row = await getSiteContentBySlug(CURRENCY_POLICY_SLUG);
  const policy = parseCurrencyPolicy(row?.data);
  const rowData = row?.data as Record<string, unknown> | undefined;
  const cacheIsBlue = isBlueCache(rowData);

  if (!options.forceRefresh && rowData && cacheIsBlue) {
    const cached = readCachedSnapshot(rowData);
    if (cached) return cached;
  }

  try {
    const { rate, source } = await fetchMarketRate();
    const snapshot: ExchangeRateSnapshot = {
      arsPerUsd: rate,
      marketArsPerUsd: rate,
      markupPercent: policy.markupPercent,
      dollarType: DOLLAR_QUOTE_TYPE,
      fetchedAt: new Date().toISOString(),
      source,
    };
    await persistSnapshot(policy, snapshot);
    return snapshot;
  } catch (err) {
    if (rowData && cacheIsBlue) {
      const fallback = readFallbackSnapshot(rowData);
      if (fallback) {
        return {
          ...fallback,
          markupPercent: policy.markupPercent,
          source: `${fallback.source} (cache)`,
        };
      }
    }

    const fallback = rowData as CachedRateRow | undefined;
    if (fallback?.arsPerUsd && fallback.arsPerUsd > 0 && cacheIsBlue) {
      const market = fallback.marketArsPerUsd ?? fallback.arsPerUsd;
      return {
        arsPerUsd: market,
        marketArsPerUsd: market,
        markupPercent: policy.markupPercent,
        dollarType: DOLLAR_QUOTE_TYPE,
        fetchedAt: fallback.fetchedAt ?? new Date(0).toISOString(),
        source: "fallback",
      };
    }

    throw err instanceof Error
      ? err
      : new Error("No hay cotización disponible.");
  }
}

export async function refreshExchangeRate(): Promise<ExchangeRateSnapshot> {
  return getExchangeRateSnapshot({ forceRefresh: true });
}
