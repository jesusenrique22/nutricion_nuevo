"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { MediaLibraryPanel } from "@/components/cms/media-library-panel";
import { ProgressStatusModal } from "@/components/ui/progress-status-modal";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import { isDisplayableCoverUrl } from "@/lib/resource-cover";
import {
  MediaUploadProvider,
  mediaFieldShellClass,
  mediaGhostBtnClass,
  mediaPrimaryBtnClass,
  mediaUrlInputClass,
  useMediaUpload,
} from "@/components/media/media-upload-context";

/**
 * Compound para logos / sellos / avatares de marca (preview cuadrado).
 * Misma pipeline de upload que ImageMedia (`kind: "image"`).
 */
function Root({
  value,
  onChange,
  folder = "brand",
  onUploaded,
  hint,
  useProgressModal = true,
  cropShape = "circle",
  children,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  onUploaded?: (url: string) => void | Promise<void>;
  hint?: string;
  useProgressModal?: boolean;
  cropShape?: "circle" | "rect" | null;
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
      cropShape={cropShape}
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
  placeholder = "/brand/logo.png o URL subida",
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

function Preview({
  objectFit = "contain",
}: {
  objectFit?: "cover" | "contain";
}) {
  const { value } = useMediaUpload();
  if (!isDisplayableCoverUrl(value)) return null;
  return (
    <div className="relative mt-3 aspect-square max-w-[160px] overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10">
      <Image
        src={value}
        alt=""
        fill
        className={objectFit === "cover" ? "object-cover" : "object-contain p-3"}
        sizes="160px"
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
      {children ?? (busy ? "Subiendo…" : "Subir icono")}
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

export const IconMedia = {
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
};
