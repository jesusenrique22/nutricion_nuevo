"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { uploadFile, uploadHint } from "@/lib/client-upload";
import type { UploadKind } from "@/lib/upload-policy";
import type { ProgressStatusPhase } from "@/components/ui/progress-status-modal";
import {
  ImageCropDialog,
  type ImageCropShape,
} from "@/components/media/image-crop-dialog";

export type MediaUploadMode = "replace" | "append";

export type MediaUploadContextValue = {
  kind: UploadKind;
  folder: string;
  value: string;
  values: string[];
  hint: string;
  busy: boolean;
  error: string | null;
  libraryRefresh: number;
  labelId: string;
  fileInputId: string;
  accept: string;
  multiple: boolean;
  modalOpen: boolean;
  phase: ProgressStatusPhase;
  modalTitle: string;
  modalDescription: string;
  onChange: (url: string) => void;
  onValuesChange: (urls: string[]) => void;
  clear: () => void;
  openFilePicker: () => void;
  uploadFiles: (files: FileList | File[] | null) => Promise<void>;
  closeModal: () => void;
  setError: (message: string | null) => void;
};

const MediaUploadContext = createContext<MediaUploadContextValue | null>(null);

export function useMediaUpload(): MediaUploadContextValue {
  const ctx = useContext(MediaUploadContext);
  if (!ctx) {
    throw new Error("Media compounds deben usarse dentro de su Root.");
  }
  return ctx;
}

const ACCEPT_BY_KIND: Record<"image" | "pdf", string> = {
  image:
    "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif",
  pdf: "application/pdf,.pdf",
};

export function MediaUploadProvider({
  kind,
  folder,
  value = "",
  values,
  onChange,
  onValuesChange,
  onUploaded,
  hint: hintProp,
  multiple = false,
  mode = "replace",
  useProgressModal = false,
  cropShape = null,
  cropAspectRatio = 1,
  children,
}: {
  kind: "image" | "pdf";
  folder: string;
  value?: string;
  values?: string[];
  onChange?: (url: string) => void;
  onValuesChange?: (urls: string[]) => void;
  onUploaded?: (url: string) => void | Promise<void>;
  hint?: string;
  multiple?: boolean;
  mode?: MediaUploadMode;
  useProgressModal?: boolean;
  /** Si se define, muestra el ajuste tipo WhatsApp antes de subir. */
  cropShape?: ImageCropShape | null;
  cropAspectRatio?: number;
  children: ReactNode;
}) {
  const labelId = useId();
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<ProgressStatusPhase>("working");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);

  const listValues = values ?? (value ? [value] : []);
  const hint = hintProp ?? uploadHint(kind);

  const openFilePicker = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const clear = useCallback(() => {
    onChange?.("");
    onValuesChange?.([]);
    setError(null);
  }, [onChange, onValuesChange]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const uploadFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (
        !files ||
        (Array.isArray(files) ? files.length === 0 : files.length === 0)
      ) {
        return;
      }
      const list = Array.from(files);
      setError(null);
      setBusy(true);

      if (useProgressModal) {
        setModalOpen(true);
        setPhase("working");
        setModalTitle(kind === "pdf" ? "Subiendo PDF…" : "Subiendo imagen…");
        setModalDescription(
          kind === "pdf"
            ? "Estamos guardando el documento. Esperá un momento."
            : "Estamos optimizando y guardando tu archivo. Esperá un momento.",
        );
      }

      try {
        const uploadedUrls: string[] = [];
        for (const file of list) {
          const { url } = await uploadFile(file, { folder, kind });
          uploadedUrls.push(url);
        }

        if (mode === "append" || multiple) {
          const next = [...listValues, ...uploadedUrls];
          onValuesChange?.(next);
          if (uploadedUrls.length === 1) onChange?.(uploadedUrls[0]!);
        } else {
          const url = uploadedUrls[0]!;
          onChange?.(url);
          onValuesChange?.([url]);
        }

        setLibraryRefresh((n) => n + 1);

        if (onUploaded && uploadedUrls[0]) {
          if (useProgressModal) {
            setModalTitle("Guardando…");
            setModalDescription(
              "El archivo ya se subió. Ahora lo estamos vinculando al contenido.",
            );
          }
          await onUploaded(uploadedUrls[0]);
        }

        if (useProgressModal) {
          setPhase("success");
          setModalTitle("Listo");
          setModalDescription(
            onUploaded
              ? "Quedó guardado y publicado correctamente."
              : kind === "pdf"
                ? "PDF subido. Si hay un botón Guardar, confirmá para publicarlo."
                : "Imagen subida. Si hay un botón Guardar, confirmá para publicarla.",
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al subir";
        setError(msg);
        if (useProgressModal) {
          setPhase("error");
          setModalTitle("No se pudo completar");
          setModalDescription(msg);
        }
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [
      folder,
      kind,
      listValues,
      mode,
      multiple,
      onChange,
      onUploaded,
      onValuesChange,
      useProgressModal,
    ],
  );

  const handlePickedFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const first = files[0]!;
      if (kind === "image" && cropShape && !multiple) {
        setCropFile(first);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      void uploadFiles(files);
    },
    [cropShape, kind, multiple, uploadFiles],
  );

  const registerFileInput = useCallback((node: HTMLInputElement | null) => {
    fileRef.current = node;
  }, []);

  const ctx: MediaUploadContextValue = {
    kind,
    folder,
    value,
    values: listValues,
    hint,
    busy,
    error,
    libraryRefresh,
    labelId,
    fileInputId,
    accept: ACCEPT_BY_KIND[kind],
    multiple,
    modalOpen,
    phase,
    modalTitle,
    modalDescription,
    onChange: onChange ?? (() => {}),
    onValuesChange: onValuesChange ?? (() => {}),
    clear,
    openFilePicker,
    uploadFiles,
    closeModal,
    setError,
  };

  return (
    <MediaUploadContext.Provider value={ctx}>
      {children}
      <input
        ref={registerFileInput}
        id={fileInputId}
        type="file"
        accept={ACCEPT_BY_KIND[kind]}
        multiple={multiple}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          handlePickedFiles(e.target.files);
        }}
      />
      <ImageCropDialog
        open={Boolean(cropFile)}
        file={cropFile}
        shape={cropShape ?? "circle"}
        cropAspectRatio={cropAspectRatio}
        title={cropShape === "rect" ? "Ajustar imagen" : "Ajustar foto"}
        onCancel={() => setCropFile(null)}
        onConfirm={(cropped) => {
          setCropFile(null);
          void uploadFiles([cropped]);
        }}
      />
    </MediaUploadContext.Provider>
  );
}

export const mediaFieldShellClass =
  "rounded-xl border border-foreground/10 bg-muted/20 p-3";

export const mediaUrlInputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

export const mediaPrimaryBtnClass =
  "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50";

export const mediaGhostBtnClass =
  "rounded-full border border-foreground/15 px-3 py-1.5 text-xs font-semibold disabled:opacity-50";
