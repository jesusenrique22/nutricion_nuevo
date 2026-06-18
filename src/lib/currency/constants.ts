import type { SupportedCurrency } from "@/lib/currency/types";

export const CURRENCY_STORAGE_KEY = "anttova_preferred_currency";

export const DEFAULT_DISPLAY_CURRENCY: SupportedCurrency = "ARS";

/** Cotización única usada en toda la plataforma (dolarapi.com/v1/dolares/blue). */
export const DOLLAR_QUOTE_TYPE = "blue" as const;

/** Intervalo de refresco en el cliente (relee cache del servidor; la tasa se renueva 1×/día). */
export const CLIENT_RATE_REFRESH_MS = 60 * 60 * 1000;

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  ARS: "Pesos (ARS)",
  USD: "Dólares (USD)",
};
