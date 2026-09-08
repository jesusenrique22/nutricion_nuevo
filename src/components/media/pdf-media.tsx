"use client";

import type { ReactNode } from "react";
import { DocumentIcon, ExternalLinkIcon } from "@/components/ui/link-icons";
import {
  MediaUploadProvider,
  mediaFieldShellClass,
  mediaGhostBtnClass,
  mediaPrimaryBtnClass,
  mediaUrlInputClass,
  useMediaUpload,
} from "@/components/media/media-upload-context";

function fileLabel(url: string) {
  return decodeURIComponent(url.split("/").pop() ?? "documento.pdf");
}

function Root({
  value,
  onChange,
  folder = "cv",
  hint,
  children,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <MediaUploadProvider
      kind="pdf"
      folder={folder}
      value={value}
      onChange={onChange}
      hint={hint}
      useProgressModal={false}
    >
      <div className={mediaFieldShellClass}>{children}</div>
    </MediaUploadProvider>
  );
}

function ListRoot({
  values,
  onChange,
  folder = "cv",
  hint,
  children,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <MediaUploadProvider
      kind="pdf"
      folder={folder}
      values={values}
      onValuesChange={onChange}
      hint={hint}
      multiple={false}
      mode="append"
      useProgressModal={false}
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

function UrlField({
  placeholder = "URL del archivo o subilo desde el botón",
}: {
  placeholder?: string;
}) {
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

function FileChip() {
  const { value } = useMediaUpload();
  if (!value) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 bg-white px-3 py-2.5 text-sm">
      <DocumentIcon className="h-5 w-5 shrink-0 text-primary/50" />
      <span className="min-w-0 flex-1 truncate text-foreground/70">
        {fileLabel(value)}
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
  );
}

function ListItems({ emptyMessage }: { emptyMessage?: string }) {
  const { values, onValuesChange } = useMediaUpload();

  function removeAt(index: number) {
    onValuesChange(values.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...values];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onValuesChange(next);
  }

  if (values.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-foreground/15 bg-white/60 px-3 py-4 text-xs text-foreground/50">
        {emptyMessage ?? "Todavía no hay PDFs. Subí uno o más archivos."}
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {values.map((url, index) => (
        <li
          key={`${url}-${index}`}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-foreground/10 bg-white px-3 py-2.5 text-sm"
        >
          <DocumentIcon className="h-5 w-5 shrink-0 text-primary/50" />
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
              className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
            >
              Ver
              <ExternalLinkIcon className="h-3 w-3" />
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
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-2">{children}</div>;
}

function UploadButton({
  children,
  list,
}: {
  children?: ReactNode;
  list?: boolean;
}) {
  const { busy, openFilePicker } = useMediaUpload();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={openFilePicker}
      className={mediaPrimaryBtnClass}
    >
      {children ??
        (busy
          ? "Subiendo…"
          : list
            ? "+ Agregar PDF"
            : "Subir PDF")}
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

function ErrorText() {
  const { error } = useMediaUpload();
  if (!error) return null;
  return <p className="mt-2 text-xs text-red-600">{error}</p>;
}

export const PdfMedia = {
  Root,
  ListRoot,
  Label,
  Hint,
  UrlField,
  FileChip,
  ListItems,
  Actions,
  UploadButton,
  ClearButton,
  ErrorText,
};
