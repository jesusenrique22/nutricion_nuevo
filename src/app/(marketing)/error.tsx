"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[marketing]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">
        Anttova
      </p>
      <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
        No pudimos cargar esta sección
      </h1>
      <p className="mt-3 max-w-md text-sm text-foreground/70 sm:text-base">
        Algo falló al obtener los datos. Podés reintentar o volver al inicio.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-full border border-primary/20 px-6 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
