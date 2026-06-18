/** URL autenticada para mostrar archivos almacenados en el panel. */
export function secureStoredFileUrl(originalUrl: string): string {
  if (originalUrl.startsWith("/api/media/")) {
    return originalUrl;
  }
  if (originalUrl.startsWith("/uploads/")) {
    return `/api/secure-file?src=${encodeURIComponent(originalUrl)}`;
  }
  return originalUrl;
}

export function resourceContentStreamUrl(resourceId: string): string {
  return `/api/resources/${resourceId}/content`;
}

export function resourceVideoStreamUrl(resourceId: string): string {
  return `/api/resources/${resourceId}/video`;
}
