import type { FormFieldDefinition } from "@/types/form-template";
import { DEFAULT_FORM_TEMPLATES } from "@/lib/form-templates-catalog";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { landingImagesToRecord } from "@/lib/landing-images-parse";
import { nutricionistaPageToRecord } from "@/lib/nutricionista-cv-parse";
import { DEFAULT_NUTRICIONISTA_PAGE } from "@/lib/nutricionista-cv-defaults";

export { DEFAULT_FORM_TEMPLATES };

export const SITE_CONTENT_DEFAULTS: Record<
  string,
  { title: string; data: Record<string, unknown> }
> = {
  landing_hero: {
    title: "Portada principal",
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
    title: "Imágenes del sitio",
    data: landingImagesToRecord(DEFAULT_LANDING_IMAGES),
  },
  nutricionista_page: {
    title: "Sobre mí",
    data: nutricionistaPageToRecord(DEFAULT_NUTRICIONISTA_PAGE),
  },
  payment_chat_policy: {
    title: "Política de pagos",
    data: {
      consultationRules: [
        {
          consultationCode: "NUT_01",
          enabled: true,
          mode: "two_phase",
          advancePercent: 50,
          singleTiming: "on_booking",
        },
        {
          consultationCode: "ENT_02",
          enabled: true,
          mode: "two_phase",
          advancePercent: 50,
          singleTiming: "on_booking",
        },
        {
          consultationCode: "ANT_03",
          enabled: true,
          mode: "two_phase",
          advancePercent: 50,
          singleTiming: "on_booking",
        },
      ],
      chatUnlockOnAppointment: false,
      chatUnlockOnAdvancePaid: false,
      chatUnlockOnRemainderPaid: false,
    },
  },
};
