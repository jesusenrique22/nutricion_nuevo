"use client";

/** Wrapper marketing sin lógica extra; el fondo global está en Providers. */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-hidden">
      {children}
    </div>
  );
}
