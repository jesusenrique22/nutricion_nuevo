"use client";

import { useRef, useState } from "react";
import { parseUploadResponse } from "@/lib/upload-response";

function fileLabel(url: string) {
  return decodeURIComponent(url.split("/").pop() ?? "documento.pdf");
}

export function PdfListUploadField({
  label,
  values,
  onChange,
  hint,
  folder = "cv",
}: {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
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
      onChange([...values, json.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...values];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-muted/20 p-3">
      <div className="text-sm">
        <span className="font-semibold">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs font-normal text-foreground/55">
            {hint}
          </span>
        )}
      </div>

      {values.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {values.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 bg-white px-3 py-2.5 text-sm"
            >
              <span aria-hidden className="text-lg">
                📄
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.1em] text-foreground/45">
                  Parte {index + 1}
                </span>
                <span className="block truncate text-foreground/70">
                  {fileLabel(url)}
                </span>
              </span>
              <div className="flex shrink-0 flex-wrap gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-lg border border-foreground/10 px-2 py-1 text-xs font-semibold disabled:opacity-30"
                  aria-label={`Subir parte ${index + 1}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === values.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-lg border border-foreground/10 px-2 py-1 text-xs font-semibold disabled:opacity-30"
                  aria-label={`Bajar parte ${index + 1}`}
                >
                  ↓
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-primary/20 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
                >
                  Ver ↗
                </a>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-foreground/15 bg-white/60 px-3 py-4 text-xs text-foreground/50">
          Todavía no hay PDFs. Subí uno o más archivos del CV.
        </p>
      )}

      <div className="mt-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {uploading ? "Subiendo…" : "+ Agregar PDF"}
        </button>
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
