"use client";

import { useEffect, useState } from "react";

function CvPageImage({ partIndex, page }: { partIndex: number; page: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setSrc(null);
    setFailed(false);

    fetch(`/api/nutricionista/cv/${partIndex}/pages/${page}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [partIndex, page]);

  if (failed) {
    return (
      <p className="px-6 py-10 text-center text-sm text-red-600">
        No se pudo cargar esta página del CV.
      </p>
    );
  }

  if (!src) {
    return <div className="min-h-[280px] animate-pulse bg-muted/20" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="block h-auto w-full max-w-full"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}

/**
 * CV en contenedor limpio: páginas renderizadas como PNG en el servidor.
 * Sin iframe, sin visor nativo del navegador (descargar / imprimir / zoom).
 */
export function NutricionistaCvPdfEmbed({
  partIndex,
}: {
  partIndex: number;
  label: string;
}) {
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTotalPages(0);

    fetch(`/api/nutricionista/cv/${partIndex}/pages`, { credentials: "include" })
      .then(async (res) => {
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            res.ok
              ? "Respuesta inválida del servidor."
              : `No se pudo cargar el CV (${res.status}).`,
          );
        }
        const data = (await res.json()) as {
          totalPages?: number;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "No se pudo cargar el CV.");
        }
        return data.totalPages ?? 0;
      })
      .then((count) => {
        if (cancelled) return;
        if (count <= 0) throw new Error("El documento no tiene páginas.");
        setTotalPages(count);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el CV.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [partIndex]);

  if (loading) {
    return (
      <div className="flex min-h-[min(70vh,720px)] items-center justify-center rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(116,30,49,0.18)] ring-1 ring-primary/10">
        <p className="text-sm text-foreground/45">Cargando documento…</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        {error}
      </p>
    );
  }

  return (
    <div
      className="rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(116,30,49,0.18)] ring-1 ring-primary/10 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="divide-y divide-foreground/5">
        {Array.from({ length: totalPages }, (_, i) => (
          <CvPageImage key={`${partIndex}-${i + 1}`} partIndex={partIndex} page={i + 1} />
        ))}
      </div>
    </div>
  );
}
