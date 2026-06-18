export const SUPPORTED_CURRENCIES = ["ARS", "USD"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

import { DOLLAR_QUOTE_TYPE } from "@/lib/currency/constants";

export type DollarQuoteType = typeof DOLLAR_QUOTE_TYPE;

export interface ExchangeRateSnapshot {
  /** Tasa de mercado (dólar blue venta). */
  marketArsPerUsd: number;
  /** Alias de marketArsPerUsd (compatibilidad con datos guardados). */
  arsPerUsd: number;
  /** Recargo % sumado al precio en USD (cubre comisiones al mover el dinero). */
  markupPercent: number;
  dollarType: DollarQuoteType;
  fetchedAt: string;
  source: string;
}

export interface MoneyValue {
  amount: number;
  currency: SupportedCurrency;
}
