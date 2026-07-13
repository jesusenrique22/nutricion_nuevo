"use client";

/** Contenedor de ancho del panel; la animación de ruta va en template.tsx. */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col px-4 pt-4 pb-10 sm:px-6 sm:pt-6 sm:pb-12 md:px-8 md:pt-8 md:pb-14">
      {children}
    </div>
  );
}
