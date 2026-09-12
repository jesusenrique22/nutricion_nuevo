/** Utilidades de URL de archivos almacenados (sin dependencias de servidor). */

/** Normaliza URLs absolutas del deploy a path relativo (`/api/media/...`). */
export function normalizeStoredUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // keep as-is
  }
  return trimmed;
}

export function parseMediaIdFromUrl(url: string): string | null {
  const normalized = normalizeStoredUrl(url).split("?")[0] ?? "";
  const match = normalized.match(/^\/api\/media\/([^/?#]+)$/);
  if (match?.[1]) return match[1];
  const gridMatch = normalized.match(/^stored:\/\/mongo-gridfs\/([^/?#]+)$/);
  return gridMatch?.[1] ?? null;
}

export function isUploadsPath(url: string): boolean {
  return normalizeStoredUrl(url).startsWith("/uploads/");
}
