"use client";

import { SessionProvider } from "next-auth/react";
import { BrandAmbientBackground } from "@/components/brand/brand-ambient-background";
import { RouteTransitionCurtain } from "@/components/motion/route-transition-curtain";
import { CurrencyProvider } from "@/contexts/currency-context";
import type { ExchangeRateSnapshot } from "@/lib/currency/types";

export function Providers({
  children,
  initialRates = null,
}: {
  children: React.ReactNode;
  initialRates?: ExchangeRateSnapshot | null;
}) {
  return (
    <SessionProvider>
      <CurrencyProvider initialRates={initialRates}>
        <BrandAmbientBackground />
        <RouteTransitionCurtain />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
      </CurrencyProvider>
    </SessionProvider>
  );
}
