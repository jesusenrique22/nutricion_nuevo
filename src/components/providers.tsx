"use client";

import { SessionProvider } from "next-auth/react";
import { BrandAmbientBackground } from "@/components/brand/brand-ambient-background";
import { RouteTransitionCurtain } from "@/components/motion/route-transition-curtain";
import { CurrencyProvider } from "@/contexts/currency-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <BrandAmbientBackground />
        <RouteTransitionCurtain />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
      </CurrencyProvider>
    </SessionProvider>
  );
}
