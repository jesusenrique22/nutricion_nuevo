"use client";

import { BrandSplashLoader } from "@/components/brand/brand-splash-loader";

/** Wrapper marketing; splash de marca en el lobby mientras cargan imágenes. */
export function MarketingShell({
  children,
  criticalImageUrls = [],
}: {
  children: React.ReactNode;
  criticalImageUrls?: string[];
}) {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden">
      <BrandSplashLoader criticalImageUrls={criticalImageUrls} />
      {children}
    </div>
  );
}
