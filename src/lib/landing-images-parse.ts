import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import type {
  GalleryItem,
  HeroSlide,
  LandingImagesData,
} from "@/types/landing-images";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseHeroSlides(value: unknown): HeroSlide[] | null {
  if (!Array.isArray(value)) return null;
  const slides: HeroSlide[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (
      !isNonEmptyString(row.src) ||
      !isNonEmptyString(row.alt) ||
      !isNonEmptyString(row.line1) ||
      !isNonEmptyString(row.line2)
    ) {
      continue;
    }
    slides.push({
      src: row.src,
      alt: row.alt,
      line1: row.line1,
      line2: row.line2,
    });
  }
  return slides.length > 0 ? slides : null;
}

function parseGallery(value: unknown): GalleryItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: GalleryItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isNonEmptyString(row.src) || !isNonEmptyString(row.alt)) continue;
    items.push({ src: row.src, alt: row.alt });
  }
  return items.length > 0 ? items : null;
}

function parseImageMap(
  value: unknown,
  keys: readonly ("nutrition" | "training" | "anthropometry")[],
): LandingImagesData["plans"] | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const result: Partial<LandingImagesData["plans"]> = {};
  for (const key of keys) {
    if (!isNonEmptyString(row[key])) return null;
    result[key] = row[key];
  }
  return result as LandingImagesData["plans"];
}

export function mergeLandingImages(
  stored: Record<string, unknown> | null | undefined,
): LandingImagesData {
  if (!stored) return DEFAULT_LANDING_IMAGES;

  const heroSlides = parseHeroSlides(stored.heroSlides);
  const gallery = parseGallery(stored.gallery);
  const plans = parseImageMap(stored.plans, [
    "nutrition",
    "training",
    "anthropometry",
  ]);
  const services = parseImageMap(stored.services, [
    "nutrition",
    "training",
    "anthropometry",
  ]);

  return {
    heroSlides: heroSlides ?? DEFAULT_LANDING_IMAGES.heroSlides,
    gallery: gallery ?? DEFAULT_LANDING_IMAGES.gallery,
    plans: plans ?? DEFAULT_LANDING_IMAGES.plans,
    services: services ?? DEFAULT_LANDING_IMAGES.services,
    philosophyImage: isNonEmptyString(stored.philosophyImage)
      ? stored.philosophyImage
      : DEFAULT_LANDING_IMAGES.philosophyImage,
    brandSectionImage: isNonEmptyString(stored.brandSectionImage)
      ? stored.brandSectionImage
      : DEFAULT_LANDING_IMAGES.brandSectionImage,
    ctaBackground: isNonEmptyString(stored.ctaBackground)
      ? stored.ctaBackground
      : DEFAULT_LANDING_IMAGES.ctaBackground,
  };
}

export function landingImagesToRecord(
  data: LandingImagesData,
): Record<string, unknown> {
  return { ...data };
}
