/** Carpetas de GridFS accesibles sin iniciar sesión (landing, CV, catálogo, etc.). */
export const PUBLIC_MEDIA_FOLDERS = new Set(["site", "cv", "brand", "products"]);

/** Carpetas visibles para cualquier usuario autenticado (plan semanal, chat…). */
export const AUTHENTICATED_MEDIA_FOLDERS = new Set([
  "weekly-plans",
  "chat",
]);

export function isPublicMediaFolder(folder: string | null | undefined): boolean {
  return Boolean(folder && PUBLIC_MEDIA_FOLDERS.has(folder));
}

export function isPublicUploadsFolder(folder: string | null): boolean {
  return folder === "site" || folder === "brand";
}
