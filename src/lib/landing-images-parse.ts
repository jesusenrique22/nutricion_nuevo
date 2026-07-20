import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import type {
  GalleryItem,
  HeroSlide,
  LandingImagesData,
} from "@/types/landing-images";
import { MAX_HERO_SLIDES } from "@/types/landing-images";

export function limitHeroSlides(slides: HeroSlide[]): HeroSlide[] {
  return slides.slice(0, MAX_HERO_SLIDES);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

const BRAND_PNG_TO_JPG: Record<string, string> = {
  "/brand/flyers/jump.png": "/brand/flyers/jump.jpg",
  "/brand/flyers/medical.png": "/brand/flyers/medical.jpg",
  "/brand/flyers/training.png": "/brand/flyers/training.jpg",
  "/brand/lifestyle/community.png": "/brand/lifestyle/community.jpg",
  "/brand/lifestyle/running.png": "/brand/lifestyle/running.jpg",
  "/brand/lifestyle/yoga-sky.png": "/brand/lifestyle/yoga-sky.jpg",
  "/brand/lifestyle/nutrition-bowl.png": "/brand/lifestyle/nutrition-bowl.jpg",
  "/brand/lifestyle/stretch.png": "/brand/lifestyle/stretch.jpg",
  "/brand/plans/nutrition.png": "/brand/plans/nutrition.jpg",
  "/brand/plans/training.png": "/brand/plans/training.jpg",
  "/brand/plans/anthropometry.png": "/brand/plans/anthropometry.jpg",
  "/brand/services/nutrition-detail.png": "/brand/services/nutrition-detail.jpg",
  "/brand/services/training-detail.png": "/brand/services/training-detail.jpg",
  "/brand/services/anthropometry-detail.png":
    "/brand/services/anthropometry-detail.jpg",
};

/** Prefiere JPG livianos (~100 KB) sobre PNG de 2–3 MB. */
function optimizeBrandSrc(src: string): string {
  return BRAND_PNG_TO_JPG[src] ?? src;
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
      src: optimizeBrandSrc(row.src),
      alt: row.alt,
      line1: row.line1,
      line2: row.line2,
    });
  }
  return slides.length > 0 ? limitHeroSlides(slides) : null;
}

function parseGallery(value: unknown): GalleryItem[] | null {
  if (!Array.isArray(value)) return null;
  const items: GalleryItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isNonEmptyString(row.src) || !isNonEmptyString(row.alt)) continue;
    items.push({ src: optimizeBrandSrc(row.src), alt: row.alt });
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
    result[key] = optimizeBrandSrc(row[key]);
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
    heroSlides: limitHeroSlides(
      heroSlides ?? DEFAULT_LANDING_IMAGES.heroSlides,
    ),
    gallery: gallery ?? DEFAULT_LANDING_IMAGES.gallery,
    plans: plans ?? DEFAULT_LANDING_IMAGES.plans,
    services: services ?? DEFAULT_LANDING_IMAGES.services,
    philosophyImage: isNonEmptyString(stored.philosophyImage)
      ? optimizeBrandSrc(stored.philosophyImage)
      : DEFAULT_LANDING_IMAGES.philosophyImage,
    brandSectionImage: isNonEmptyString(stored.brandSectionImage)
      ? optimizeBrandSrc(stored.brandSectionImage)
      : DEFAULT_LANDING_IMAGES.brandSectionImage,
    ctaBackground: isNonEmptyString(stored.ctaBackground)
      ? optimizeBrandSrc(stored.ctaBackground)
      : DEFAULT_LANDING_IMAGES.ctaBackground,
  };
}

export function landingImagesToRecord(
  data: LandingImagesData,
): Record<string, unknown> {
  return {
    ...data,
    heroSlides: limitHeroSlides(data.heroSlides),
  };
}
