import {
  BRAND_FLYERS,
  BRAND_LIFESTYLE,
  BRAND_PLANS,
  BRAND_PRESENTATION,
  BRAND_SERVICES,
} from "@/lib/brand-assets";
import type { LandingImagesData } from "@/types/landing-images";

export const DEFAULT_LANDING_IMAGES: LandingImagesData = {
  heroSlides: [
    {
      src: BRAND_FLYERS.jump,
      alt: "Energía y wellness Anttova",
      line1: "Happy · Healthy",
      line2: "Nutrición con intención",
    },
    {
      src: BRAND_FLYERS.medical,
      alt: "Asesoría Anttova",
      line1: "Tu cuerpo cambia",
      line2: "Cuando tu estilo de vida cambia contigo",
    },
    {
      src: BRAND_FLYERS.training,
      alt: "Entrenamiento Anttova",
      line1: "Entrena tu cuerpo",
      line2: "Equilibra tu vida",
    },
  ],
  gallery: [
    { src: BRAND_LIFESTYLE.community, alt: "Comunidad Anttova" },
    { src: BRAND_LIFESTYLE.running, alt: "Movimiento diario" },
    { src: BRAND_LIFESTYLE.yogaSky, alt: "Flexibilidad y bienestar" },
    { src: BRAND_LIFESTYLE.nutritionBowl, alt: "Nutrición consciente" },
    { src: BRAND_LIFESTYLE.stretch, alt: "Disciplina y constancia" },
  ],
  plans: {
    nutrition: BRAND_PLANS.nutrition,
    training: BRAND_PLANS.training,
    anthropometry: BRAND_PLANS.anthropometry,
  },
  services: {
    nutrition: BRAND_SERVICES.nutrition,
    training: BRAND_SERVICES.training,
    anthropometry: BRAND_SERVICES.anthropometry,
  },
  philosophyImage: BRAND_PRESENTATION.recipeSuccess,
  brandSectionImage: "/brand/products.png",
  ctaBackground: BRAND_LIFESTYLE.community,
};
