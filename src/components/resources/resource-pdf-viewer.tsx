"use client";

import { useEffect, useState } from "react";

export function ResourcePdfViewer({
  resourceId,
  title,
}: {
  resourceId: string;
  title: string;
}) {
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);
    setTotalPages(0);

    fetch(`/api/resources/${resourceId}/pages`, { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json()) as {
          totalPages?: number;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "No se pudo cargar el PDF.");
        }
        return data.totalPages ?? 0;
      })
      .then((count) => {
        if (cancelled) return;
        if (count <= 0) throw new Error("El PDF no tiene páginas.");
        setTotalPages(count);
        setPage(1);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el PDF.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  useEffect(() => {
    if (loading || error || totalPages === 0) return;
    setPageLoading(true);
    const timer = window.setTimeout(() => setPageLoading(false), 150);
    return () => window.clearTimeout(timer);
  }, [page, loading, error, totalPages]);

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-foreground/55">
        Cargando documento…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        {error}
      </p>
    );
  }

  const pageSrc = `/api/resources/${resourceId}/pages/${page}?t=${resourceId}-${page}`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-muted/20 ring-1 ring-foreground/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={pageSrc}
          src={pageSrc}
          alt={`${title}, página ${page} de ${totalPages}`}
          className="mx-auto block max-w-full"
          draggable={false}
          onLoad={() => setPageLoading(false)}
          onError={() =>
            setError("No se pudo mostrar esta página. Recargá e intentá de nuevo.")
          }
        />
        {pageLoading && (
          <p className="py-2 text-center text-xs text-foreground/45">
            Cargando página…
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || pageLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm tabular-nums text-foreground/65">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || pageLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
