"use client";

import { useEffect, useState } from "react";
import {
  resourceContentStreamUrl,
  resourceVideoStreamUrl,
} from "@/lib/secure-media-url";
import { ResourcePdfViewer } from "@/components/resources/resource-pdf-viewer";

type ContentKind = "pdf" | "image" | "video" | "unknown";
type ProbeState = "idle" | "loading" | "ok" | "forbidden" | "missing" | "error";

export function ProtectedContentViewer({
  resourceId,
  title,
  contentKind,
  hasVideo,
  hasContent,
}: {
  resourceId: string;
  title: string;
  contentKind: ContentKind;
  hasVideo: boolean;
  hasContent: boolean;
}) {
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
  // y antes no se renderizaba nada: en la duda se intenta como documento, que
  // es lo que Anttova sube en la práctica.
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
        Contenido exclusivo para tu cuenta. Visualización dentro de Anttova; no
        está disponible para descarga directa.
      </p>
    </div>
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
