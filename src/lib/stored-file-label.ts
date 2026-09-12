import {
  normalizeStoredUrl,
  parseMediaIdFromUrl,
} from "@/lib/stored-file-url";

/** Etiqueta inmediata sin consultar la base (p. ej. mientras carga el nombre real). */
export function quickStoredFileLabel(
  url: string,
  fallback = "documento.pdf",
): string {
  const normalized = normalizeStoredUrl(url).trim();
  if (!normalized) return fallback;

  if (normalized.startsWith("/api/media/")) {
    return fallback;
  }

  try {
    if (/^https?:\/\//i.test(normalized)) {
      const name = decodeURIComponent(
        new URL(normalized).pathname.split("/").pop() ?? "",
      );
      return name || fallback;
    }
  } catch {
    // seguir
  }

  const segment = decodeURIComponent(normalized.split("/").pop() ?? "");
  if (segment && !segment.includes("?")) return segment;
  return fallback;
}

export function isInternalStoredMediaUrl(url: string): boolean {
  const normalized = normalizeStoredUrl(url);
  return (
    normalized.startsWith("/api/media/") ||
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("stored://")
  );
}

export function mediaIdFromStoredUrl(url: string): string | null {
  return parseMediaIdFromUrl(url);
}
