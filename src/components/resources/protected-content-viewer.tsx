"use client";

import { useEffect, useState } from "react";
import {
  resourceContentStreamUrl,
  resourceVideoStreamUrl,
} from "@/lib/secure-media-url";
import { ResourcePdfViewer } from "@/components/resources/resource-pdf-viewer";

type ContentKind = "pdf" | "image" | "video" | "document" | "unknown";
type ProbeState = "idle" | "loading" | "ok" | "forbidden" | "missing" | "error";

export function ProtectedContentViewer({
  resourceId,
  title,
  contentKind,
  hasVideo,
  hasContent,
  allowDownload = false,
}: {
  resourceId: string;
  title: string;
  contentKind: ContentKind;
  hasVideo: boolean;
  hasContent: boolean;
  allowDownload?: boolean;
}) {
  const canDownload = allowDownload && hasContent;
  const contentUrl = hasContent ? resourceContentStreamUrl(resourceId) : null;
  const videoUrl = hasVideo ? resourceVideoStreamUrl(resourceId) : null;
  const [effectiveKind, setEffectiveKind] = useState<ContentKind>(contentKind);
  const [probe, setProbe] = useState<ProbeState>(
    hasContent ? "loading" : "idle",
  );

  useEffect(() => {
    setEffectiveKind(contentKind);
  }, [contentKind]);

  useEffect(() => {
    if (!hasContent || !contentUrl) {
      setProbe("idle");
      return;
    }

    let cancelled = false;
    setProbe("loading");

    fetch(contentUrl, { method: "HEAD", credentials: "include" })
      .then((res) => {
        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          setProbe("forbidden");
          return;
        }
        if (res.status === 404) {
          setProbe("missing");
          return;
        }
        if (!res.ok) {
          setProbe("error");
          return;
        }

        const kindHeader = res.headers.get("x-content-kind");
        const ct = res.headers.get("content-type") || "";
        if (kindHeader === "image" || ct.startsWith("image/")) {
          setEffectiveKind("image");
        } else if (kindHeader === "pdf" || ct === "application/pdf") {
          setEffectiveKind("pdf");
        } else if (kindHeader === "document") {
          // Word/Excel/PowerPoint: sin visor, solo descarga.
          setEffectiveKind("document");
        }
        setProbe("ok");
      })
      .catch(() => {
        // Sin respuesta al HEAD no sabemos el tipo, pero el archivo puede estar
        // perfecto: dejamos que el visor lo intente en vez de mostrar nada.
        if (!cancelled) setProbe("ok");
      });

    return () => {
      cancelled = true;
    };
  }, [contentUrl, hasContent]);

  // Un recurso sin extensión en la URL (p. ej. /api/media/<id>) daba "unknown"
  // y antes no se renderizaba nada: en la duda se intenta como PDF, que es lo
  // que Anttova sube en la práctica. Un ofimático nunca entra acá: el servidor
  // lo identifica como "document" y se entrega solo por descarga.
  const resolvedKind: ContentKind =
    effectiveKind === "unknown" && hasContent ? "pdf" : effectiveKind;

  const readable = probe === "ok" || probe === "loading";
  const showPdf = hasContent && contentUrl && resolvedKind === "pdf" && readable;
  const showImage =
    hasContent && contentUrl && resolvedKind === "image" && readable;

  useEffect(() => {
    function blockSave(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", blockSave);
    return () => window.removeEventListener("keydown", blockSave);
  }, []);

  return (
    <div
      className="space-y-6 rounded-3xl border border-foreground/10 bg-white p-6"
      onContextMenu={(e) => e.preventDefault()}
    >
      {canDownload && (
        <a
          href={`/api/resources/${resourceId}/download`}
          // Enlace directo, sin JS: el navegador descarga en streaming y no hay
          // estado intermedio que pueda quedarse colgado.
          download
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <DownloadIcon />
          Descargar archivo
        </a>
      )}

      {hasVideo && videoUrl && (
        <div className="overflow-hidden rounded-2xl bg-black">
          <video
            src={videoUrl}
            controls
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            className="w-full"
            playsInline
          >
            Tu navegador no soporta video embebido.
          </video>
        </div>
      )}

      {showImage && (
        <div className="overflow-hidden rounded-2xl bg-muted/20 p-2 ring-1 ring-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={contentUrl}
            alt={title}
            className="mx-auto max-h-[75vh] w-full object-contain"
            draggable={false}
          />
        </div>
      )}

      {showPdf && <ResourcePdfViewer resourceId={resourceId} title={title} />}

      {!showPdf && !showImage && !hasVideo && probe === "ok" && (
        <p className="text-sm text-foreground/55">
          {canDownload
            ? "Este archivo no se puede previsualizar acá. Usá el botón de arriba para descargarlo."
            : "Este archivo no se puede abrir dentro de Anttova. Pedile a Anttova que habilite la descarga."}
        </p>
      )}

      {probe === "missing" && (
        <ContentNotice>
          El archivo de este recurso todavía no está cargado. Escribile a
          Anttova para que lo suba y vas a poder abrirlo desde acá — tu compra
          sigue registrada.
        </ContentNotice>
      )}

      {probe === "forbidden" && (
        <ContentNotice>
          Tu sesión no tiene permiso para abrir este archivo. Cerrá sesión,
          volvé a entrar y reintentá; si sigue igual, avisale a Anttova.
        </ContentNotice>
      )}

      {probe === "error" && (
        <ContentNotice>
          No pudimos cargar el documento en este momento. Actualizá la página en
          unos minutos.
        </ContentNotice>
      )}

      {!hasVideo && !hasContent && (
        <p className="text-sm text-foreground/50">
          Este recurso todavía no tiene archivo adjunto. Anttova tiene que
          subirlo desde el panel de recursos.
        </p>
      )}

      {hasContent && resolvedKind === "video" && !hasVideo && (
        <p className="text-sm text-foreground/50">
          Configurá la URL de video o subí un archivo compatible.
        </p>
      )}

      <p className="text-xs text-foreground/45">
        {canDownload
          ? "Contenido exclusivo para tu cuenta. Podés descargarlo para uso personal."
          : "Contenido exclusivo para tu cuenta. Visualización dentro de Anttova; no está disponible para descarga directa."}
      </p>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3v10m0 0 4-4m-4 4-4-4" />
      <path d="M3 15v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

function ContentNotice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-2xl bg-amber-50 px-4 py-5 text-sm text-amber-900 ring-1 ring-amber-200/70"
    >
      {children}
    </p>
  );
}
