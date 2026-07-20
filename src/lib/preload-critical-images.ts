import { preload } from "react-dom";

/**
 * Arranca la descarga de imágenes LCP / above-the-fold en paralelo con el HTML,
 * antes de que el <Image> del body las pida.
 */
export function preloadCriticalImages(
  srcs: Array<string | null | undefined>,
): void {
  const seen = new Set<string>();
  for (const raw of srcs) {
    const href = raw?.trim();
    if (!href || seen.has(href)) continue;
    seen.add(href);
    preload(href, { as: "image" });
  }
}
