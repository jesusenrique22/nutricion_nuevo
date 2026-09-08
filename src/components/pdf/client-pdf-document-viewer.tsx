"use client";

import { useEffect, useRef, useState } from "react";

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => {
      width: number;
      height: number;
    };
    render: (opts: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      canvas: HTMLCanvasElement;
    }) => { promise: Promise<void> };
  }>;
  destroy?: () => Promise<void> | void;
};

async function loadPdfDocument(data: ArrayBuffer): Promise<PdfDoc> {
  const bytes = new Uint8Array(data);
  const header = String.fromCharCode(...bytes.slice(0, 5));
  if (header !== "%PDF-") {
    throw new Error(
      "El documento no es un PDF válido. Pedile a Anttova que lo vuelva a subir desde Recursos.",
    );
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf/pdf.worker.min.mjs";
  try {
    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    return doc as unknown as PdfDoc;
  } catch {
    throw new Error(
      "No se pudo abrir el PDF. Puede estar dañado o incompleto; pedí que lo vuelvan a subir.",
    );
  }
}

function PdfPageCanvas({
  doc,
  pageNum,
  maxWidth,
}: {
  doc: PdfDoc;
  pageNum: number;
  maxWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const page = await doc.getPage(pageNum);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(maxWidth / base.width, 2);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        }).promise;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, pageNum, maxWidth]);

  if (failed) {
    return (
      <p className="px-6 py-10 text-center text-sm text-red-600">
        No se pudo mostrar esta página.
      </p>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto block h-auto w-full max-w-full bg-white"
      aria-label={`Página ${pageNum}`}
    />
  );
}

/**
 * Visor PDF en el navegador (pdf.js + canvas HTML).
 * El archivo se descarga por `pdfUrl` (API autenticada / con Referer).
 */
export function ClientPdfDocumentViewer({
  pdfUrl,
  maxWidth = 1100,
  className,
}: {
  pdfUrl: string;
  maxWidth?: number;
  className?: string;
}) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<PdfDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);

    (async () => {
      try {
        const res = await fetch(pdfUrl, { credentials: "include" });
        if (!res.ok) {
          const detail = (await res.text().catch(() => "")).trim();
          const safeDetail =
            detail &&
            detail.length < 200 &&
            !detail.startsWith("<") &&
            !detail.includes("/api/")
              ? detail
              : null;
          throw new Error(
            res.status === 403 || res.status === 401
              ? "No autorizado para ver este documento."
              : safeDetail ||
                  "No se pudo cargar el documento. Intentá de nuevo más tarde.",
          );
        }
        const buffer = await res.arrayBuffer();
        const loaded = await loadPdfDocument(buffer);
        if (cancelled) {
          await loaded.destroy?.();
          return;
        }
        docRef.current = loaded;
        setDoc(loaded);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el PDF.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      const current = docRef.current;
      docRef.current = null;
      void current?.destroy?.();
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div
        className={
          className ??
          "flex min-h-[min(70vh,720px)] items-center justify-center rounded-2xl bg-white ring-1 ring-primary/10"
        }
      >
        <p className="text-sm text-foreground/45">Cargando documento…</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        {error ?? "No se pudo cargar el PDF."}
      </p>
    );
  }

  return (
    <div
      className={
        className ??
        "rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgba(116,30,49,0.18)] ring-1 ring-primary/10 select-none"
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="divide-y divide-foreground/5">
        {Array.from({ length: doc.numPages }, (_, i) => (
          <div key={`${pdfUrl}-${i + 1}`} className="bg-muted/10 p-2 sm:p-4">
            <PdfPageCanvas doc={doc} pageNum={i + 1} maxWidth={maxWidth} />
          </div>
        ))}
      </div>
    </div>
  );
}
