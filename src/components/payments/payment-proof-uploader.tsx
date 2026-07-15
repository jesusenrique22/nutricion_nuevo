"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/client-upload";

export function PaymentProofUploader({
  maxFiles = 1,
  urls,
  onChange,
  disabled = false,
}: {
  maxFiles?: number;
  urls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const singleFile = maxFiles <= 1;
  const hasProof = urls.length > 0;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;
    setError(null);

    if (!singleFile && urls.length >= maxFiles) {
      setError(`Máximo ${maxFiles} captura${maxFiles === 1 ? "" : "s"}.`);
      return;
    }

    const file = fileList[0];
    if (!file) return;

    setUploading(true);

    try {
      const { url } = await uploadFile(file, {
        kind: "proof",
        endpoint: "/api/payments/upload-proof",
      });
      onChange(singleFile ? [url] : [...urls, url]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al subir la captura.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeProof() {
    onChange([]);
  }

  const buttonLabel = uploading
    ? "Subiendo captura…"
    : hasProof
      ? "Cambiar captura"
      : "Subir captura del comprobante";

  return (
    <div className="space-y-3">
      {hasProof && (
        <div className="relative overflow-hidden rounded-xl border border-foreground/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[0]}
            alt="Captura del comprobante"
            className="h-32 w-full object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={removeProof}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white"
              aria-label="Quitar captura"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif"
            disabled={uploading}
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            {buttonLabel}
          </button>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
