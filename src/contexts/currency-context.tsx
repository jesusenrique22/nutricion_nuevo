"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  convertAmount,
  parseMoneyAmount,
  displayArsPerUsd,
  effectiveMarkupPercent,
} from "@/lib/currency/convert";
import { formatMoney } from "@/lib/currency/format";
import {
  CLIENT_RATE_REFRESH_MS,
  CURRENCY_STORAGE_KEY,
  DEFAULT_DISPLAY_CURRENCY,
} from "@/lib/currency/constants";
import type {
  ExchangeRateSnapshot,
  SupportedCurrency,
} from "@/lib/currency/types";

type CurrencyContextValue = {
  displayCurrency: SupportedCurrency;
  setDisplayCurrency: (currency: SupportedCurrency) => void;
  rates: ExchangeRateSnapshot | null;
  ratesLoading: boolean;
  /** Tasa blue del día (1 USD = X ARS). */
  arsPerUsd: number;
  /** Recargo % aplicado al precio mostrado en USD. */
  markupPercent: number;
  setPreviewMarkupPercent: (percent: number | null) => void;
  refreshRates: () => Promise<void>;
  syncRates: (snapshot: ExchangeRateSnapshot) => void;
  convert: (
    amount: string | number,
    fromCurrency?: SupportedCurrency,
  ) => number;
  formatPrice: (
    amount: string | number,
    fromCurrency?: SupportedCurrency,
  ) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredCurrency(): SupportedCurrency {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_CURRENCY;
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
  return stored === "USD" || stored === "ARS"
    ? stored
    : DEFAULT_DISPLAY_CURRENCY;
}

async function fetchRates(): Promise<ExchangeRateSnapshot | null> {
  try {
    const res = await fetch(`/api/currency/rates?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ExchangeRateSnapshot;
  } catch {
    // Red caída, HMR o tab en background: no tumbar la UI.
    return null;
  }
}

export function CurrencyProvider({
  children,
  initialRates = null,
}: {
  children: ReactNode;
  /** Snapshot SSR: evita el fetch /api/currency/rates en el primer paint. */
  initialRates?: ExchangeRateSnapshot | null;
}) {
  const [displayCurrency, setDisplayCurrencyState] =
    useState<SupportedCurrency>(DEFAULT_DISPLAY_CURRENCY);
  const [rates, setRates] = useState<ExchangeRateSnapshot | null>(initialRates);
  const [ratesLoading, setRatesLoading] = useState(!initialRates);
  const [previewMarkupPercent, setPreviewMarkupPercent] = useState<
    number | null
  >(null);

  const loadRates = useCallback(async () => {
    const snapshot = await fetchRates();
    if (snapshot) {
      setRates(snapshot);
      setPreviewMarkupPercent(null);
    }
    setRatesLoading(false);
  }, []);

  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    await loadRates();
  }, [loadRates]);

  const syncRates = useCallback((snapshot: ExchangeRateSnapshot) => {
    setRates(snapshot);
    setPreviewMarkupPercent(null);
    setRatesLoading(false);
  }, []);

  useEffect(() => {
    setDisplayCurrencyState(readStoredCurrency());
    if (!initialRates) {
      void loadRates();
    }
    const timer = window.setInterval(() => {
      void loadRates();
    }, CLIENT_RATE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadRates, initialRates]);

  const setDisplayCurrency = useCallback((currency: SupportedCurrency) => {
    setDisplayCurrencyState(currency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, []);

  const arsPerUsd = displayArsPerUsd(rates);
  const markupPercent = effectiveMarkupPercent(rates, previewMarkupPercent);

  const convert = useCallback(
    (amount: string | number, fromCurrency: SupportedCurrency = "ARS") => {
      const value = parseMoneyAmount(amount);
      if (displayCurrency === fromCurrency || arsPerUsd <= 0) return value;
      return convertAmount(
        value,
        fromCurrency,
        displayCurrency,
        arsPerUsd,
        markupPercent,
      );
    },
    [displayCurrency, arsPerUsd, markupPercent],
  );

  const formatPrice = useCallback(
    (amount: string | number, fromCurrency: SupportedCurrency = "ARS") => {
      const value = parseMoneyAmount(amount);
      if (value === 0) return "Gratis";
      if (arsPerUsd <= 0 && displayCurrency !== fromCurrency) {
        return formatMoney(value, fromCurrency);
      }
      const converted = convertAmount(
        value,
        fromCurrency,
        displayCurrency,
        arsPerUsd,
        markupPercent,
      );
      return formatMoney(converted, displayCurrency);
    },
    [displayCurrency, arsPerUsd, markupPercent],
  );

  const value = useMemo(
    () => ({
      displayCurrency,
      setDisplayCurrency,
      rates,
      ratesLoading,
      arsPerUsd,
      markupPercent,
      setPreviewMarkupPercent,
      refreshRates,
      syncRates,
      convert,
      formatPrice,
    }),
    [
      displayCurrency,
      setDisplayCurrency,
      rates,
      ratesLoading,
      arsPerUsd,
      markupPercent,
      refreshRates,
      syncRates,
      convert,
      formatPrice,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency debe usarse dentro de CurrencyProvider.");
  }
  return ctx;
}

/** Para componentes que pueden renderizarse sin provider (fallback ARS). */
export function useCurrencyOptional() {
  return useContext(CurrencyContext);
}
