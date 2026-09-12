import { normalizeStoredUrl } from "@/lib/stored-file-url";

/** URL autenticada para mostrar archivos almacenados en el panel. */
export function secureStoredFileUrl(originalUrl: string): string {
  const normalized = normalizeStoredUrl(originalUrl);
  if (
    normalized.startsWith("/api/media/") ||
    normalized.startsWith("/uploads/")
  ) {
    return `/api/secure-file?src=${encodeURIComponent(normalized)}`;
  }
  return originalUrl;
}

export function resourceContentStreamUrl(resourceId: string): string {
  return `/api/resources/${resourceId}/content`;
}

export function resourceVideoStreamUrl(resourceId: string): string {
  return `/api/resources/${resourceId}/video`;
}
