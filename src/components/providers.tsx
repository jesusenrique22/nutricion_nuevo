"use client";

import { SessionProvider } from "next-auth/react";
import { BrandAmbientBackground } from "@/components/brand/brand-ambient-background";
import { RouteTransitionCurtain } from "@/components/motion/route-transition-curtain";
import { CurrencyProvider } from "@/contexts/currency-context";
import { BookingTimezoneProvider } from "@/contexts/booking-timezone-context";
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
        <BookingTimezoneProvider>
          <BrandAmbientBackground />
          <RouteTransitionCurtain />
          <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
        </BookingTimezoneProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}
