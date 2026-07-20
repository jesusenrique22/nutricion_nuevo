/** Datos iniciales del seed (imports relativos desde prisma/). */

import { DEFAULT_NUTRICIONISTA_PAGE } from "../src/lib/nutricionista-cv-defaults";
import { nutricionistaPageToRecord } from "../src/lib/nutricionista-cv-parse";
import { DEFAULT_FORM_TEMPLATES } from "../src/lib/form-templates-catalog";

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
    data: {
      heroSlides: [
        {
          src: "/brand/flyers/jump.jpg",
          alt: "Energía y wellness Anttova",
          line1: "Happy · Healthy",
          line2: "Nutrición con intención",
        },
        {
          src: "/brand/flyers/medical.jpg",
          alt: "Asesoría Anttova",
          line1: "Tu cuerpo cambia",
          line2: "Cuando tu estilo de vida cambia contigo",
        },
        {
          src: "/brand/flyers/training.jpg",
          alt: "Entrenamiento Anttova",
          line1: "Entrena tu cuerpo",
          line2: "Equilibra tu vida",
        },
      ],
      gallery: [
        { src: "/brand/lifestyle/community.jpg", alt: "Comunidad Anttova" },
        { src: "/brand/lifestyle/running.jpg", alt: "Movimiento diario" },
        { src: "/brand/lifestyle/yoga-sky.jpg", alt: "Flexibilidad y bienestar" },
        {
          src: "/brand/lifestyle/nutrition-bowl.jpg",
          alt: "Nutrición consciente",
        },
        { src: "/brand/lifestyle/stretch.jpg", alt: "Disciplina y constancia" },
      ],
      plans: {
        nutrition: "/brand/plans/nutrition.jpg",
        training: "/brand/plans/training.jpg",
        anthropometry: "/brand/plans/anthropometry.jpg",
      },
      services: {
        nutrition: "/brand/services/nutrition-detail.jpg",
        training: "/brand/services/training-detail.jpg",
        anthropometry: "/brand/services/anthropometry-detail.jpg",
      },
      philosophyImage: "/brand/presentation/recipe-success.png",
      brandSectionImage: "/brand/products.png",
      ctaBackground: "/brand/lifestyle/community.jpg",
    },
  },
  nutricionista_page: {
    title: "Sobre mí",
    data: nutricionistaPageToRecord(DEFAULT_NUTRICIONISTA_PAGE),
  },
  payment_chat_policy: {
    title: "Pagos y acceso al chat",
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
      chatUnlockOnAppointment: true,
      chatUnlockOnAdvancePaid: true,
      chatUnlockOnRemainderPaid: true,
    },
  },
  currency_policy: {
    title: "Cotización y monedas",
    data: {
      markupPercent: 5,
      dollarType: "blue",
    },
  },
  payment_checkout_policy: {
    title: "Checkout y comprobantes de pago",
    data: {
      contact: {
        phone: "+(54) 9 11 3819 2675",
        phoneHref: "tel:+5491138192675",
        instagram: "@anttova_fitness",
        instagramHref: "https://instagram.com/anttova_fitness",
        email: "ma.lanzahuerta@gmail.com",
        emailHref: "mailto:ma.lanzahuerta@gmail.com",
      },
      methods: [
        {
          id: "zelle",
          label: "Zelle",
          detail: "Mariantolanza00@gmail.com",
        },
        {
          id: "mercado_pago",
          label: "Mercado Pago",
          detail: "Anttova",
        },
      ],
      referenceLabel: "Número de referencia / comprobante",
      referencePlaceholder: "Ej. 1234567890 o ID de operación",
      referenceRequired: true,
      proofsLabel: "Capturas del pago",
      proofsHint:
        "Sube una o más capturas de pantalla del comprobante (JPG, PNG o WebP).",
      maxProofFiles: 5,
      showOptionalNote: true,
      optionalNoteLabel: "Nota adicional (opcional)",
      optionalNotePlaceholder: "Ej. titular de la cuenta, horario del pago",
    },
  },
};
