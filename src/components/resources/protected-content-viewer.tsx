"use client";

import { useEffect } from "react";
import {
  resourceContentStreamUrl,
  resourceVideoStreamUrl,
} from "@/lib/secure-media-url";

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

      {hasContent && contentUrl && contentKind === "pdf" && (
        <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
          <iframe
            src={`${contentUrl}#toolbar=0&navpanes=0`}
            title={title}
            className="h-[75vh] w-full bg-muted/20"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {hasContent && contentUrl && contentKind === "unknown" && (
        <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
          <iframe
            src={contentUrl}
            title={title}
            className="h-[75vh] w-full bg-muted/20"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {!hasVideo && !hasContent && (
        <p className="text-sm text-foreground/50">
          Este recurso no tiene archivo adjunto configurado aún.
        </p>
      )}

      <p className="text-xs text-foreground/45">
        Contenido exclusivo para tu cuenta. Visualización dentro de Anttova; no
        está disponible para descarga directa.
      </p>
    </div>
  );
}
