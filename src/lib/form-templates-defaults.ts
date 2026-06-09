import type { FormFieldDefinition } from "@/types/form-template";
import { DEFAULT_FORM_TEMPLATES } from "@/lib/form-templates-catalog";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { landingImagesToRecord } from "@/lib/landing-images-parse";

export { DEFAULT_FORM_TEMPLATES };

export const SITE_CONTENT_DEFAULTS: Record<
  string,
  { title: string; data: Record<string, unknown> }
> = {
  landing_hero: {
    title: "Hero landing",
    data: {
      headline: "Tu bienestar, tu camino",
      subheadline:
        "Nutrición, entrenamiento y antropometría con la Lic. Ma Antonieta Lanza.",
      ctaLabel: "Agendar consulta",
      ctaHref: "/register",
    },
  },
  landing_packages: {
    title: "Paquetes y precios",
    data: {
      nutPrice: "$35.000",
      entPrice: "$40.000",
      antPrice: "$25.000",
      currencyNote: "Precios en pesos argentinos",
    },
  },
  landing_about: {
    title: "Sobre la nutricionista",
    data: {
      name: "Lic. Ma Antonieta Lanza",
      bio: "Nutricionista especializada en bienestar integral, composición corporal y hábitos sostenibles.",
    },
  },
  landing_images: {
    title: "Imágenes landing",
    data: landingImagesToRecord(DEFAULT_LANDING_IMAGES),
  },
};
