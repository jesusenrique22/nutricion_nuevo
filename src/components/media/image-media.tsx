"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { MediaLibraryPanel } from "@/components/cms/media-library-panel";
import {
  ProgressStatusModal,
} from "@/components/ui/progress-status-modal";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
import type { ProductImage } from "@/types/products";
import { uploadFile, uploadHint } from "@/lib/client-upload";
import { useRef, useState } from "react";
import {
  MediaUploadProvider,
  mediaFieldShellClass,
  mediaGhostBtnClass,
  mediaPrimaryBtnClass,
  mediaUrlInputClass,
  useMediaUpload,
} from "@/components/media/media-upload-context";

function Root({
  value,
  onChange,
  folder = "site",
  onUploaded,
  hint,
  useProgressModal = true,
  children,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  onUploaded?: (url: string) => void | Promise<void>;
  hint?: string;
  useProgressModal?: boolean;
  children: ReactNode;
}) {
  return (
    <MediaUploadProvider
      kind="image"
      folder={folder}
      value={value}
      onChange={onChange}
      onUploaded={onUploaded}
      hint={hint}
      useProgressModal={useProgressModal}
    >
      <div className={mediaFieldShellClass}>{children}</div>
    </MediaUploadProvider>
  );
}

function Label({ children }: { children: ReactNode }) {
  const { labelId } = useMediaUpload();
  return (
    <span id={labelId} className="block text-sm font-semibold">
      {children}
    </span>
  );
}

function Hint({ children }: { children?: ReactNode }) {
  const { hint } = useMediaUpload();
  return (
    <span className="mt-0.5 block text-xs font-normal text-foreground/55">
      {children ?? hint}
    </span>
  );
}

function UrlField({ placeholder = "/brand/... o URL subida" }: { placeholder?: string }) {
  const { value, onChange, busy, labelId } = useMediaUpload();
  return (
    <input
      aria-labelledby={labelId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={mediaUrlInputClass}
      placeholder={placeholder}
      disabled={busy}
    />
  );
}

function Preview({
  aspect = "video",
  objectFit = "cover",
}: {
  aspect?: "video" | "square";
  objectFit?: "cover" | "contain";
}) {
  const { value } = useMediaUpload();
  if (!isDisplayableCoverUrl(value)) return null;
  return (
    <div
      className={`relative mt-3 overflow-hidden rounded-lg bg-muted ${
        aspect === "square" ? "aspect-square max-w-[200px]" : "aspect-video"
      }`}
    >
      <Image
        src={value}
        alt=""
        fill
        className={objectFit === "contain" ? "object-contain p-2" : "object-cover"}
        sizes={aspect === "square" ? "200px" : "320px"}
        loading="eager"
        unoptimized={shouldUnoptimizeImage(value)}
      />
    </div>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-2">{children}</div>;
}

function UploadButton({ children }: { children?: ReactNode }) {
  const { busy, openFilePicker } = useMediaUpload();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={openFilePicker}
      className={mediaPrimaryBtnClass}
    >
      {children ?? (busy ? "Subiendo…" : "Subir imagen")}
    </button>
  );
}

function ClearButton({ children }: { children?: ReactNode }) {
  const { value, busy, clear } = useMediaUpload();
  if (!value) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={clear}
      className={mediaGhostBtnClass}
    >
      {children ?? "Quitar"}
    </button>
  );
}

function Library() {
  const { folder, value, onChange, libraryRefresh } = useMediaUpload();
  return (
    <MediaLibraryPanel
      folder={folder}
      selectedUrl={value}
      onSelect={onChange}
      refreshKey={libraryRefresh}
    />
  );
}

function StatusModal() {
  const {
    modalOpen,
    phase,
    modalTitle,
    modalDescription,
    closeModal,
    error,
  } = useMediaUpload();

  return (
    <>
      {error && !modalOpen && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
      <ProgressStatusModal
        open={modalOpen}
        phase={phase}
        title={modalTitle}
        description={modalDescription}
        onClose={closeModal}
        closeLabel={phase === "success" ? "Perfecto" : "Cerrar"}
      />
    </>
  );
}

function ErrorText() {
  const { error, modalOpen } = useMediaUpload();
  if (!error || modalOpen) return null;
  return <p className="mt-2 text-xs text-red-600">{error}</p>;
}

/** Lista de imágenes de producto (múltiples, reorder, alt). */
function ProductListRoot({
  label,
  images,
  onChange,
  folder = "products",
  productName,
  children,
}: {
  label: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  folder?: string;
  productName?: string;
  children?: ReactNode;
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
    <div className={mediaFieldShellClass}>
      <div className="text-sm">
        <span className="font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs font-normal text-foreground/55">
          {uploadHint("image")} Podés subir varias fotos; la primera es la
          principal en el catálogo.
        </span>
      </div>

      {children ?? (
        <>
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
            <p className="mt-3 text-xs text-foreground/45">
              Sin imágenes todavía.
            </p>
          )}
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
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

export const ImageMedia = {
  Root,
  Label,
  Hint,
  UrlField,
  Preview,
  Actions,
  UploadButton,
  ClearButton,
  Library,
  StatusModal,
  ErrorText,
  ProductListRoot,
};
