import { preload } from "react-dom";
import type { LandingImagesData } from "@/types/landing-images";

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

/** URLs del lobby que conviene precargar durante el splash de marca. */
export function collectCriticalLandingUrls(
  data: LandingImagesData,
): string[] {
  const seen = new Set<string>();
  const add = (url?: string | null) => {
    const href = url?.trim();
    if (href) seen.add(href);
  };

  for (const slide of data.heroSlides) add(slide.src);
  add(data.services.nutrition);
  add(data.services.training);
  add(data.services.anthropometry);
  add(data.plans.nutrition);
  add(data.plans.training);
  add(data.plans.anthropometry);
  add(data.ctaBackground);
  add(data.brandSectionImage);
  add(data.philosophyImage);

  return [...seen];
}

/** Server component: dispara preload en el head vía React DOM. */
export function CriticalImagePreload({ urls }: { urls: string[] }) {
  preloadCriticalImages(urls);
  return null;
}
