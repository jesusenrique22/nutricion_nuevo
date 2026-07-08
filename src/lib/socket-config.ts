/**
 * Socket.io desactivado por defecto hasta tener servidor de chat en producción.
 * Activar con NEXT_PUBLIC_SOCKET_ENABLED=true y NEXT_PUBLIC_SOCKET_URL.
 */
export function isSocketClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SOCKET_ENABLED === "true";
}

export function getSocketClientUrl(): string | null {
  if (!isSocketClientEnabled()) return null;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!url) return null;
  if (typeof window !== "undefined") {
    const onProdHost = !/localhost|127\.0\.0\.1/.test(window.location.hostname);
    if (onProdHost && /localhost|127\.0\.0\.1/.test(url)) return null;
  }
  return url;
}
