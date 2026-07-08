"use client";

import { useEffect } from "react";
import {
  resourceContentStreamUrl,
  resourceVideoStreamUrl,
} from "@/lib/secure-media-url";
import { ResourcePdfViewer } from "@/components/resources/resource-pdf-viewer";

export function ProtectedContentViewer({
  resourceId,
  title,
  contentKind,
  hasVideo,
  hasContent,
}: {
  resourceId: string;
  title: string;
  contentKind: "pdf" | "image" | "video" | "unknown";
  hasVideo: boolean;
  hasContent: boolean;
}) {
  const contentUrl = hasContent ? resourceContentStreamUrl(resourceId) : null;
  const videoUrl = hasVideo ? resourceVideoStreamUrl(resourceId) : null;
  const showPdf =
    hasContent &&
    contentUrl &&
    (contentKind === "pdf" || contentKind === "unknown");

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

      {hasContent && contentUrl && contentKind === "image" && (
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

      {showPdf && (
        <ResourcePdfViewer resourceId={resourceId} title={title} />
      )}

      {!hasVideo && !hasContent && (
        <p className="text-sm text-foreground/50">
          Este recurso no tiene archivo adjunto. Subí un PDF en{" "}
          <strong>Archivo principal</strong> al editarlo en el panel de
          recursos.
        </p>
      )}

      {hasContent && !showPdf && contentKind === "video" && !hasVideo && (
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
