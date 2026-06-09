/** Datos iniciales del seed (sin imports de @/ para evitar errores de TS en prisma/). */

export const DEFAULT_FORM_TEMPLATES: Record<
  string,
  { name: string; fields: Record<string, unknown>[] }
> = {
  follow_up: {
    name: "Formulario de seguimiento",
    fields: [
      {
        id: "currentWeight",
        name: "currentWeight",
        label: "Peso actual (kg)",
        type: "number",
        required: true,
        step: 3,
      },
      {
        id: "energyLevel",
        name: "energyLevel",
        label: "Nivel de energía",
        type: "select",
        required: true,
        step: 3,
        options: [
          { value: "baja", label: "Baja" },
          { value: "normal", label: "Normal" },
          { value: "alta", label: "Alta" },
        ],
      },
      {
        id: "adherence",
        name: "adherence",
        label: "¿Cómo seguiste el plan?",
        type: "select",
        required: true,
        step: 3,
        options: [
          { value: "muy_bien", label: "Muy bien" },
          { value: "bien", label: "Bien" },
          { value: "regular", label: "Regular" },
          { value: "mal", label: "Mal" },
        ],
      },
      {
        id: "symptoms",
        name: "symptoms",
        label: "Síntomas o molestias",
        type: "textarea",
        required: true,
        minLength: 3,
        step: 3,
      },
      {
        id: "notes",
        name: "notes",
        label: "Algo más que quieras comentar",
        type: "textarea",
        required: true,
        minLength: 3,
        step: 3,
      },
    ],
  },
  nutrition: {
    name: "Primera consulta nutricional",
    fields: [
      {
        id: "fullName",
        name: "fullName",
        label: "Nombre completo",
        type: "text",
        required: true,
        step: 2,
      },
      {
        id: "phone",
        name: "phone",
        label: "Teléfono",
        type: "tel",
        required: true,
        step: 2,
      },
      {
        id: "consultationReason",
        name: "consultationReason",
        label: "¿Qué te trae a consulta?",
        type: "textarea",
        required: true,
        minLength: 5,
        step: 3,
      },
      {
        id: "dietDescription",
        name: "dietDescription",
        label: "¿Cómo describirías tu alimentación?",
        type: "textarea",
        required: true,
        step: 3,
      },
    ],
  },
};

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
    data: {
      heroSlides: [
        {
          src: "/brand/flyers/jump.png",
          alt: "Energía y wellness Anttova",
          line1: "Happy · Healthy",
          line2: "Nutrición con intención",
        },
        {
          src: "/brand/flyers/medical.png",
          alt: "Asesoría Anttova",
          line1: "Tu cuerpo cambia",
          line2: "Cuando tu estilo de vida cambia contigo",
        },
        {
          src: "/brand/flyers/training.png",
          alt: "Entrenamiento Anttova",
          line1: "Entrena tu cuerpo",
          line2: "Equilibra tu vida",
        },
      ],
      gallery: [
        { src: "/brand/lifestyle/community.png", alt: "Comunidad Anttova" },
        { src: "/brand/lifestyle/running.png", alt: "Movimiento diario" },
        { src: "/brand/lifestyle/yoga-sky.png", alt: "Flexibilidad y bienestar" },
        {
          src: "/brand/lifestyle/nutrition-bowl.png",
          alt: "Nutrición consciente",
        },
        { src: "/brand/lifestyle/stretch.png", alt: "Disciplina y constancia" },
      ],
      plans: {
        nutrition: "/brand/plans/nutrition.png",
        training: "/brand/plans/training.png",
        anthropometry: "/brand/plans/anthropometry.png",
      },
      services: {
        nutrition: "/brand/services/nutrition-detail.png",
        training: "/brand/services/training-detail.png",
        anthropometry: "/brand/services/anthropometry-detail.png",
      },
      philosophyImage: "/brand/presentation/recipe-success.png",
      brandSectionImage: "/brand/products.png",
      ctaBackground: "/brand/lifestyle/community.png",
    },
  },
};
