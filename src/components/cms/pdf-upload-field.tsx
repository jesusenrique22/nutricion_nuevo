"use client";

import { useRef, useState } from "react";
import { parseUploadResponse } from "@/lib/upload-response";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export function PdfUploadField({
  label,
  value,
  onChange,
  hint,
  folder = "cv",
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

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/resources/upload", {
        method: "POST",
        body: fd,
      });
      const json = await parseUploadResponse(res);
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
          placeholder="/uploads/cv/... o /api/media/..."
        />
      </label>

      {value && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 bg-white px-3 py-2.5 text-sm">
          <span aria-hidden className="text-lg">
            📄
          </span>
          <span className="min-w-0 flex-1 truncate text-foreground/70">
            {value.split("/").pop()}
          </span>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            Ver PDF ↗
          </a>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {uploading ? "Subiendo…" : "Subir PDF"}
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
        accept="application/pdf"
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
