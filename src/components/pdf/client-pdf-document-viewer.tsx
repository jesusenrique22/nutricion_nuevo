"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PdfViewport = { width: number; height: number };

type PdfPage = {
  getViewport: (opts: { scale: number }) => PdfViewport;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    canvas: HTMLCanvasElement;
  }) => { promise: Promise<void>; cancel?: () => void };
  cleanup?: () => void;
};

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy?: () => Promise<void> | void;
};

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
const DEFAULT_ZOOM_INDEX = 2; // 1x

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

/**
 * Una página. Solo pinta cuando está cerca del viewport: un PDF de cientos de
 * páginas no puede rasterizarse entero de golpe sin tumbar el navegador.
 */
function PdfPageCanvas({
  doc,
  pageNum,
  width,
  zoom,
  onVisible,
  registerRef,
}: {
  doc: PdfDoc;
  pageNum: number;
  width: number;
  zoom: number;
  onVisible: (pageNum: number) => void;
  registerRef: (pageNum: number, el: HTMLDivElement | null) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(pageNum <= 2);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState(1.294); // A4 por defecto, evita saltos

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNear(true);
            if (entry.intersectionRatio > 0.5) onVisible(pageNum);
          }
        }
      },
      { rootMargin: "800px 0px", threshold: [0, 0.5] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNum, onVisible]);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    let task: { cancel?: () => void } | null = null;

    (async () => {
      try {
        const page = await doc.getPage(pageNum);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        setRatio(base.height / base.width);

        // devicePixelRatio para que el texto no se vea borroso en pantallas HiDPI.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = ((width * zoom) / base.width) * dpr;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        const render = page.render({ canvasContext: context, viewport, canvas });
        task = render;
        await render.promise;
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (!cancelled && name !== "RenderingCancelledException") {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.cancel?.();
      } catch {
        // el render ya había terminado
      }
    };
  }, [doc, pageNum, width, zoom, near]);

  return (
    <div
      ref={(el) => {
        holderRef.current = el;
        registerRef(pageNum, el);
      }}
      data-page={pageNum}
      className="relative bg-white shadow-[0_2px_12px_-4px_rgba(116,30,49,0.25)]"
      style={{ aspectRatio: `1 / ${ratio}` }}
    >
      {failed ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-600">
          No se pudo mostrar esta página.
        </p>
      ) : (
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          aria-label={`Página ${pageNum}`}
        />
      )}
      <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-foreground/55 px-2 py-0.5 text-[10px] font-bold text-white">
        {pageNum}
      </span>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold text-white/85 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/**
 * Visor de PDF propio.
 *
 * El documento se rasteriza a canvas dentro de la página: nunca se entrega el
 * archivo al visor nativo del navegador, que trae botones de descarga e
 * impresión. Eso no es DRM —quien ve el contenido puede fotografiarlo— pero
 * quita la vía cómoda para quedarse con el archivo y redistribuirlo.
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
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [currentPage, setCurrentPage] = useState(1);
  const [containerWidth, setContainerWidth] = useState(maxWidth);

  const docRef = useRef<PdfDoc | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());

  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);
    setCurrentPage(1);

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

  // Ancho real disponible: el zoom multiplica sobre esto, no sobre maxWidth.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 32;
      setContainerWidth(Math.max(280, Math.min(maxWidth, available)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxWidth, doc]);

  // Sin atajos de guardar ni imprimir mientras el visor está en pantalla.
  useEffect(() => {
    function blockShortcuts(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && ["s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", blockShortcuts);
    return () => window.removeEventListener("keydown", blockShortcuts);
  }, []);

  const registerRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(pageNum, el);
    else pageRefs.current.delete(pageNum);
  }, []);

  const handleVisible = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
  }, []);

  const goToPage = useCallback(
    (pageNum: number) => {
      if (!doc) return;
      const target = Math.min(Math.max(1, pageNum), doc.numPages);
      const el = pageRefs.current.get(target);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(target);
    },
    [doc],
  );

  const pages = useMemo(
    () => (doc ? Array.from({ length: doc.numPages }, (_, i) => i + 1) : []),
    [doc],
  );

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
      className={`pdf-guard overflow-hidden rounded-2xl ring-1 ring-primary/10 ${className ?? ""}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolbarButton
            label="Página anterior"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ↑
          </ToolbarButton>
          <ToolbarButton
            label="Página siguiente"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= doc.numPages}
          >
            ↓
          </ToolbarButton>
          <span className="ml-1 select-none text-xs font-semibold tabular-nums text-white/85">
            Página {currentPage} de {doc.numPages}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton
            label="Alejar"
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={zoomIndex <= 0}
          >
            −
          </ToolbarButton>
          <button
            type="button"
            onClick={() => setZoomIndex(DEFAULT_ZOOM_INDEX)}
            title="Restablecer zoom"
            className="min-w-14 select-none rounded-full px-2 text-xs font-bold tabular-nums text-white/85 transition hover:bg-white/15 hover:text-white"
          >
            {Math.round(zoom * 100)}%
          </button>
          <ToolbarButton
            label="Acercar"
            onClick={() =>
              setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
            }
            disabled={zoomIndex >= ZOOM_STEPS.length - 1}
          >
            +
          </ToolbarButton>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[min(78vh,900px)] overflow-auto bg-muted/30 px-4 py-4"
      >
        {/* Sin maxWidth: por encima del 100% el zoom tiene que poder desbordar
            y que scrollee el contenedor, si no acercar no haría nada. */}
        <div
          className="mx-auto flex w-fit flex-col items-center gap-4 select-none"
          style={{ width: containerWidth * zoom }}
        >
          {pages.map((pageNum) => (
            <PdfPageCanvas
              key={`${pdfUrl}-${pageNum}`}
              doc={doc}
              pageNum={pageNum}
              width={containerWidth}
              zoom={zoom}
              onVisible={handleVisible}
              registerRef={registerRef}
            />
          ))}
        </div>
      </div>

      <p className="bg-white px-3 py-2 text-center text-[11px] text-foreground/45">
        Lectura dentro de Anttova · el documento no se descarga ni se imprime
      </p>
    </div>
  );
}

/** Aviso que ocupa el lugar del visor si alguien manda a imprimir la página. */
export function PdfPrintNotice() {
  return (
    <p className="pdf-guard-print-notice">
      Este material es de lectura exclusiva dentro de Anttova y no está
      disponible para imprimir.
    </p>
  );
}
