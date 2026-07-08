/** Política central de uploads — sin restricciones de dimensiones, solo tipo y peso. */

export const UPLOAD_LIMITS = {
  image: 50 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  proof: 15 * 1024 * 1024,
  default: 50 * 1024 * 1024,
} as const;

export type UploadKind = "image" | "pdf" | "video" | "proof" | "any";

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
  "avif",
]);

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

const ALLOWED_MIME: Record<UploadKind, Set<string>> = {
  image: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/pjpeg",
  ]),
  pdf: new Set([
    "application/pdf",
    "application/x-pdf",
    "application/octet-stream",
  ]),
  video: new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]),
  proof: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/pjpeg",
  ]),
  any: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/avif",
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
  if (kind === "image") return IMAGE_EXT.has(ext);
  if (kind === "pdf") return PDF_EXT.has(ext);
  if (kind === "video") return VIDEO_EXT.has(ext);
  if (kind === "proof") return IMAGE_EXT.has(ext);
  if (kind === "any") {
    return IMAGE_EXT.has(ext) || PDF_EXT.has(ext) || VIDEO_EXT.has(ext);
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

  const allowed = ALLOWED_MIME[kind];
  const mimeOk = allowed.has(mime);
  const extOk = ext ? extMatchesKind(ext, kind) : false;

  if (!mimeOk && !extOk) {
    const labels: Record<UploadKind, string> = {
      image: "imágenes (JPG, PNG, WebP, GIF, HEIC…)",
      pdf: "archivos PDF",
      video: "videos MP4 o WebM",
      proof: "capturas JPG, PNG o WebP",
      any: "imágenes, PDF o video",
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
