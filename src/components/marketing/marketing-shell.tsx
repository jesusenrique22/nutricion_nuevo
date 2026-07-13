"use client";

/** Wrapper marketing sin lógica extra; el fondo global está en Providers. */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
