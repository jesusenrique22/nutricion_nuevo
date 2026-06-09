"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "site");
      const res = await fetch("/api/resources/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Error al subir");
      }
      onChange(json.url);
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
        {hint && (
          <span className="mt-0.5 block text-xs font-normal text-foreground/55">
            {hint}
          </span>
        )}
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
            unoptimized={value.startsWith("/uploads/")}
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
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
