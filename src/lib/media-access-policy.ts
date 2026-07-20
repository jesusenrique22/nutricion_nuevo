/**
 * Carpetas GridFS /uploads accesibles sin sesión (landing, login, CV, catálogo…).
 * Una sola fuente de verdad — no duplicar listas en otros archivos.
 */
export const PUBLIC_MEDIA_FOLDER_LIST = [
  "site",
  "cv",
  "brand",
  /** Foto login/registro (público). Preferir esta carpeta para subidas nuevas. */
  "login",
  /** Legacy: subidas viejas a `auth`; se mantiene pública. */
  "auth",
  "products",
  "packages",
] as const;

export type PublicMediaFolder = (typeof PUBLIC_MEDIA_FOLDER_LIST)[number];

export const PUBLIC_MEDIA_FOLDERS = new Set<string>(PUBLIC_MEDIA_FOLDER_LIST);

/** Carpetas visibles para cualquier usuario autenticado (plan semanal, chat…). */
export const AUTHENTICATED_MEDIA_FOLDERS = new Set([
  "weekly-plans",
  "chat",
]);

/** Carpeta de subida para branding de la pantalla de acceso. */
export const LOGIN_BRANDING_MEDIA_FOLDER = "login" as const;

export function isPublicMediaFolder(folder: string | null | undefined): boolean {
  return Boolean(folder && PUBLIC_MEDIA_FOLDERS.has(folder));
}

/** @deprecated Usar isPublicMediaFolder — mismo criterio. */
export function isPublicUploadsFolder(folder: string | null): boolean {
  return isPublicMediaFolder(folder);
}
