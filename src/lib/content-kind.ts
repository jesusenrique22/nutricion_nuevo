/**
 * Heurística liviana del tipo de contenido a partir de URL / tipo de recurso.
 * No importa Mongo ni Prisma — seguro para páginas SSR (límite Vercel 250 MB).
 */
export function guessContentKindFromUrl(
  url: string | null | undefined,
  resourceType?: string,
): "pdf" | "image" | "video" | "unknown" {
  if (!url) return "unknown";
  const lower = url.trim().toLowerCase();
  try {
    if (/^https?:\/\//i.test(lower)) {
      const parsed = new URL(lower);
      const path = `${parsed.pathname}${parsed.search}`;
      return guessFromPath(path, resourceType);
    }
  } catch {
    // seguir con el string crudo
  }
  return guessFromPath(lower, resourceType);
}

function guessFromPath(
  path: string,
  resourceType?: string,
): "pdf" | "image" | "video" | "unknown" {
  if (/\.(jpe?g|png|webp|gif)(\?|$)/.test(path)) return "image";
  if (/\.(mp4|webm)(\?|$)/.test(path)) return "video";
  if (/\.pdf(\?|$)/.test(path)) return "pdf";
  if (resourceType === "EBOOK" || resourceType === "PACKAGE") return "pdf";
  if (resourceType === "VIDEO") return "video";
  return "unknown";
}
