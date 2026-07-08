"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadFile, uploadHint } from "@/lib/client-upload";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type { ProductImage } from "@/types/products";

export function ProductImagesUploadField({
  label,
  images,
  onChange,
  folder = "products",
  productName,
}: {
  label: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  folder?: string;
  productName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError(null);
    try {
      const next = [...images];
      for (const file of Array.from(fileList)) {
        const { url } = await uploadFile(file, { folder, kind: "image" });
        next.push({
          src: url,
          alt: productName?.trim() || "Imagen del producto",
        });
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function updateAlt(index: number, alt: string) {
    onChange(images.map((img, i) => (i === index ? { ...img, alt } : img)));
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-muted/20 p-3">
      <div className="text-sm">
        <span className="font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs font-normal text-foreground/55">
          {uploadHint("image")} Podés subir varias fotos; la primera es la
          principal en el catálogo.
        </span>
      </div>

      {images.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {images.map((img, index) => (
            <li
              key={`${img.src}-${index}`}
              className="rounded-xl border border-foreground/10 bg-white p-3"
            >
              <div className="flex gap-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized={shouldUnoptimizeImage(img.src)}
                  />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                      Principal
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="block text-xs">
                    <span className="font-semibold text-foreground/60">
                      Texto alternativo (accesibilidad)
                    </span>
                    <input
                      value={img.alt}
                      onChange={(e) => updateAlt(index, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-foreground/15 px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="rounded border border-foreground/15 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === images.length - 1}
                      className="rounded border border-foreground/15 px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-foreground/45">Sin imágenes todavía.</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="mt-3 w-full rounded-xl border border-dashed border-foreground/25 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {uploading ? "Subiendo…" : "+ Agregar foto(s)"}
      </button>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
