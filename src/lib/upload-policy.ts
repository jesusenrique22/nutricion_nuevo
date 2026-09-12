/** Política central de uploads — sin restricciones de dimensiones, solo tipo y peso. */

const MB = 1024 * 1024;

/** Tope por archivo en panel admin / recursos (equilibrio Vercel + PDFs habituales). */
export const UPLOAD_LIMITS = {
  image: 20 * MB,
  pdf: 20 * MB,
  video: 20 * MB,
  proof: 15 * MB,
  default: 20 * MB,
} as const;

export type UploadKind = "image" | "pdf" | "video" | "proof" | "any";

/** Extensiones de imagen que se pueden subir una vez normalizadas a web. */
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif"]);

/** Formatos que el sitio puede mostrar en todos los navegadores modernos. */
const WEB_SAFE_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

const PDF_EXT = new Set(["pdf"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v"]);

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

/** Mime que se pueden guardar en disco/Mongo (después de normalizar en el cliente). */
const WEB_SAFE_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/pjpeg",
]);

const UNSAFE_IMAGE_MIME = new Set([
  "image/heic",
  "image/heif",
  "image/avif",
]);

const ALLOWED_MIME: Record<UploadKind, Set<string>> = {
  image: new Set([...WEB_SAFE_IMAGE_MIME]),
  pdf: new Set([
    "application/pdf",
    "application/x-pdf",
    "application/octet-stream",
  ]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]),
  proof: new Set([...WEB_SAFE_IMAGE_MIME]),
  any: new Set([
    ...WEB_SAFE_IMAGE_MIME,
    "application/pdf",
    "application/x-pdf",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]),
};

function fileExtension(name: string): string {
  const base = name.split("/").pop() ?? name;
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

export function isUnsafeImageFormat(file: {
  type?: string;
  name: string;
}): boolean {
  const mime = (file.type ?? "").trim().toLowerCase();
  const ext = fileExtension(file.name);
  if (UNSAFE_IMAGE_MIME.has(mime)) return true;
  if (ext === "heic" || ext === "heif" || ext === "avif") return true;
  return false;
}

export function isImageUploadCandidate(file: {
  type?: string;
  name: string;
}): boolean {
  const mime = (file.type ?? "").trim().toLowerCase();
  if (mime.startsWith("image/")) return true;
  return IMAGE_EXT.has(fileExtension(file.name));
}

export function resolveUploadMime(file: File): string {
  const ext = fileExtension(file.name);
  const fromExt = ext ? MIME_BY_EXT[ext] : undefined;
  const reported = file.type?.trim().toLowerCase();
  if (reported && reported !== "application/octet-stream") return reported;
  return fromExt ?? reported ?? "application/octet-stream";
}

function kindFromMime(mime: string): UploadKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || mime === "application/x-pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  return null;
}

function extMatchesKind(ext: string, kind: UploadKind): boolean {
  if (kind === "image") return WEB_SAFE_IMAGE_EXT.has(ext);
  if (kind === "pdf") return PDF_EXT.has(ext);
  if (kind === "video") return VIDEO_EXT.has(ext);
  if (kind === "proof") return WEB_SAFE_IMAGE_EXT.has(ext);
  if (kind === "any") {
    return (
      WEB_SAFE_IMAGE_EXT.has(ext) || PDF_EXT.has(ext) || VIDEO_EXT.has(ext)
    );
  }
  return false;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function uploadLimitLabel(kind: UploadKind): string {
  const max = UPLOAD_LIMITS[kind === "any" ? "default" : kind];
  return formatBytes(max);
}

export type UploadValidationResult =
  | { ok: true; mime: string }
  | { ok: false; message: string };

export function validateUploadFile(
  file: File,
  kind: UploadKind,
): UploadValidationResult {
  const mime = resolveUploadMime(file);
  const ext = fileExtension(file.name);
  const maxBytes =
    UPLOAD_LIMITS[kind === "any" ? "default" : kind] ?? UPLOAD_LIMITS.default;

  if (file.size <= 0) {
    return { ok: false, message: "El archivo está vacío." };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `Archivo demasiado grande (máx. ${formatBytes(maxBytes)}).`,
    };
  }

  // HEIC/HEIF/AVIF no se ven igual en todos los navegadores: hay que convertir
  // a JPG/PNG/WebP en el cliente antes de llegar acá.
  if (
    kind !== "pdf" &&
    kind !== "video" &&
    isUnsafeImageFormat({ type: mime, name: file.name })
  ) {
    return {
      ok: false,
      message:
        "Ese formato de imagen (p. ej. HEIC de iPhone) no se ve en todos los navegadores. El sistema debería convertirlo a JPG automáticamente; si ves este mensaje, exportá la foto como JPG o PNG.",
    };
  }

  const allowed = ALLOWED_MIME[kind];
  const mimeOk = allowed.has(mime);
  const extOk = ext ? extMatchesKind(ext, kind) : false;

  if (!mimeOk && !extOk) {
    const labels: Record<UploadKind, string> = {
      image: "imágenes (JPG, PNG o WebP)",
      pdf: "archivos PDF",
      video: "videos MP4 o WebM",
      proof: "capturas JPG, PNG o WebP",
      any: "imágenes web (JPG/PNG/WebP), PDF o video",
    };
    return {
      ok: false,
      message: `Tipo no permitido. Usá ${labels[kind]}.`,
    };
  }

  if (kind === "pdf" && !PDF_EXT.has(ext) && !mime.includes("pdf")) {
    return { ok: false, message: "Solo se permiten archivos PDF." };
  }

  const resolvedKind = kindFromMime(mime) ?? (extOk ? kind : null);
  if (kind !== "any" && kind !== "proof" && resolvedKind && resolvedKind !== kind) {
    return {
      ok: false,
      message: `Se esperaba ${kind === "pdf" ? "un PDF" : kind === "image" ? "una imagen" : "un video"}.`,
    };
  }

  return { ok: true, mime };
}
