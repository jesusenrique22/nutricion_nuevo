"use client";

import { useRef, useState } from "react";
import { uploadFile, uploadHint } from "@/lib/client-upload";
import { DocumentIcon, ExternalLinkIcon } from "@/components/ui/link-icons";

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

  const resolvedHint = hint ?? uploadHint("pdf");

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadFile(file, { folder, kind: "pdf" });
      onChange(url);
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
          placeholder="/uploads/cv/... o /api/media/..."
        />
      </label>

      {value && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 bg-white px-3 py-2.5 text-sm">
          <DocumentIcon className="h-5 w-5 shrink-0 text-primary/50" />
          <span className="min-w-0 flex-1 truncate text-foreground/70">
            {value.split("/").pop()}
          </span>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Ver PDF
            <ExternalLinkIcon className="h-3 w-3" />
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
        accept="application/pdf,.pdf"
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
