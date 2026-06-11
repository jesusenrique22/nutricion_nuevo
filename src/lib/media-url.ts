/** Archivo servido desde MongoDB GridFS vía /api/media/[id] */
export function isMongoMediaUrl(url: string): boolean {
  return url.startsWith("/api/media/");
}

export function isCloudinaryUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("cloudinary.com");
  } catch {
    return false;
  }
}

/** Rutas que Next/Image no debe optimizar. */
export function shouldUnoptimizeImage(src: string): boolean {
  return (
    src.startsWith("/uploads/") ||
    isMongoMediaUrl(src) ||
    (src.startsWith("http") && !src.includes("res.cloudinary.com"))
  );
}
