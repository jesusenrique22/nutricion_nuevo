"use client";

import { useCallback, useEffect, useState } from "react";
import { secureStoredFileUrl } from "@/lib/secure-media-url";

function ProofThumbnail({
  src,
  alt,
  onOpen,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-xl border border-dashed border-foreground/20 bg-muted/40 px-2 text-center text-[10px] text-foreground/50">
        No se pudo cargar
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block overflow-hidden rounded-xl border border-foreground/10 bg-muted/30 transition hover:ring-2 hover:ring-primary/25"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-28 w-28 object-cover"
        onError={() => setFailed(true)}
      />
    </button>
  );
}

export function PaymentProofGallery({
  urls,
  title = "Capturas del pago",
}: {
  urls: string[];
  title?: string;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close]);

  if (urls.length === 0) return null;

  const secureUrls = urls.map(secureStoredFileUrl);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-foreground/45">
        {title}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {secureUrls.map((url, i) => (
          <li key={`${url}-${i}`}>
            <ProofThumbnail
              src={url}
              alt={`Comprobante ${i + 1}`}
              onOpen={() => setLightbox(url)}
            />
          </li>
        ))}
      </ul>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Comprobante de pago"
          onClick={close}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute -top-10 right-0 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground"
            >
              Cerrar
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="Comprobante ampliado"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
