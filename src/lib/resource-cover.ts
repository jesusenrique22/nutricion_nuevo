const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i;

export function isLocalCoverPath(url: string): boolean {
  return url.startsWith("/");
}

export function isDisplayableCoverUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const trimmed = url.trim();
  if (isLocalCoverPath(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return IMAGE_EXT.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function coverUrlValidationMessage(url: string): string | null {
  if (!url.trim()) return null;
  if (isDisplayableCoverUrl(url)) return null;
  return "La portada debe ser una imagen (.jpg, .png, .webp) o subir un archivo; no uses enlaces a artículos.";
}
