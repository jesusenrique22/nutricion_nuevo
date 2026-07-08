"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadFile, uploadHint } from "@/lib/client-upload";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
import { MediaLibraryPanel } from "@/components/cms/media-library-panel";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  folder = "site",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  folder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryRefresh, setLibraryRefresh] = useState(0);

  const resolvedHint = hint ?? uploadHint("image");

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadFile(file, { folder, kind: "image" });
      onChange(url);
      setLibraryRefresh((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-muted/20 p-3">
      <label className="block text-sm">
        <span className="font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs font-normal text-foreground/55">
          {resolvedHint}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="/brand/... o URL subida"
        />
      </label>

      {isDisplayableCoverUrl(value) && (
        <div className="relative mt-3 aspect-video overflow-hidden rounded-lg bg-muted">
          <Image
            src={value}
            alt=""
            fill
            className="object-cover"
            sizes="320px"
            loading="eager"
            unoptimized={shouldUnoptimizeImage(value)}
          />
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {uploading ? "Subiendo…" : "Subir imagen"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full border border-foreground/15 px-3 py-1.5 text-xs font-semibold"
          >
            Quitar
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <MediaLibraryPanel
        folder={folder}
        selectedUrl={value}
        onSelect={onChange}
        refreshKey={libraryRefresh}
      />
    </div>
  );
}
