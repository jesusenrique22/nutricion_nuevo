"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type { ProductImage } from "@/types/products";

export function ProductImageGallery({
  images,
  productName,
  className = "",
}: {
  images: ProductImage[];
  productName: string;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const safeActive = Math.min(active, Math.max(0, images.length - 1));
  const current = images[safeActive];

  const go = useCallback(
    (delta: number) => {
      if (images.length <= 1) return;
      setActive((i) => (i + delta + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, go]);

  if (images.length === 0) {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-2xl bg-muted/30 text-sm text-foreground/40 ${className}`}
      >
        Sin imagen
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
        {images.length > 1 && (
          <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:w-16 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
            {images.map((img, index) => (
              <button
                key={`${img.src}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                  safeActive === index
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-foreground/10 hover:border-primary/40"
                }`}
              >
                <Image
                  src={img.src}
                  alt={img.alt || productName}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized={shouldUnoptimizeImage(img.src)}
                />
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative order-1 aspect-square w-full flex-1 overflow-hidden rounded-2xl bg-muted/30 sm:order-2"
          aria-label="Ampliar imagen"
        >
          <Image
            src={current.src}
            alt={current.alt || productName}
            fill
            className="object-contain p-2 transition duration-300 hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 480px"
            priority
            unoptimized={shouldUnoptimizeImage(current.src)}
          />
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
            Ampliar
          </span>
        </button>
      </div>

      {lightbox &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setLightbox(false)}
              className="absolute inset-0"
            />
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
            >
              Cerrar
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-4"
                  aria-label="Imagen anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-4"
                  aria-label="Imagen siguiente"
                >
                  ›
                </button>
              </>
            )}
            <div className="relative z-[1] h-[min(85vh,720px)] w-full max-w-4xl">
              <Image
                src={current.src}
                alt={current.alt || productName}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={shouldUnoptimizeImage(current.src)}
              />
            </div>
            {images.length > 1 && (
              <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-sm text-white/80">
                {safeActive + 1} / {images.length}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
