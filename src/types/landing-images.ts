export interface HeroSlide {
  src: string;
  alt: string;
  line1: string;
  line2: string;
}

export interface GalleryItem {
  src: string;
  alt: string;
}

export interface LandingImagesData {
  heroSlides: HeroSlide[];
  gallery: GalleryItem[];
  plans: {
    nutrition: string;
    training: string;
    anthropometry: string;
  };
  services: {
    nutrition: string;
    training: string;
    anthropometry: string;
  };
  philosophyImage: string;
  brandSectionImage: string;
  ctaBackground: string;
}

export const LANDING_IMAGES_SLUG = "landing_images";

/** Máximo de diapositivas en el carrusel hero del lobby. */
export const MAX_HERO_SLIDES = 5;
