import type { NutricionistaPageData } from "@/types/nutricionista-cv";
import { BRAND_PROFILE } from "@/lib/brand-assets";

export const DEFAULT_NUTRICIONISTA_PAGE: NutricionistaPageData = {
  pageTitle: "Sobre mí",
  pageDescription:
    "Conocé a la profesional detrás de Anttova: nutrición, antropometría ISAK y entrenamiento con enfoque integral.",
  about: {
    headline: "¿Quién soy?",
    intro:
      "Soy María Antonieta Lanza, licenciada en Nutrición, antropometrista ISAK y entrenadora personal. Acompaño a cada persona con un plan integral que combina alimentación consciente, entrenamiento y mediciones precisas.",
    highlights: [
      "Me apasiona traducir la ciencia en hábitos sostenibles y realistas.",
      "Trabajo de forma cercana, escuchando tu contexto y tus objetivos.",
      "Creo en el bienestar integral: cuerpo, mente y rutina alineados.",
    ],
    approachHeadline: "¿Cómo trabajo?",
    approachIntro:
      "Mi propuesta se basa en tres pilares que integran nutrición, movimiento y evaluación objetiva:",
    approachHighlights: [
      "Nutrición consciente: planes adaptados a tu vida, no al revés.",
      "Entrenamiento a medida: fuerza, composición corporal y hábitos.",
      "Mediciones precisas: seguimiento objetivo con protocolo ISAK.",
    ],
    approachClosing:
      "El resultado: un proceso claro, medible y sostenible para alcanzar tus metas de salud.",
    specialtyLinkLabel: "Más sobre mi especialidad",
    specialtyPageTitle: "Formación y experiencia",
    specialtyPageDescription:
      "Estudios, certificaciones y trayectoria profesional de la Lic. Ma Antonieta Lanza.",
  },
  cvPdfUrls: [],
  cv: {
    name: "María Antonieta Lanza",
    title: "Personal trainer",
    bio: "Licenciada en Nutrición, antropometrista ISAK y entrenadora, con enfoque en nutrición deportiva y salud integral.",
    photoUrl: BRAND_PROFILE.professional,
    contact: {
      phone: "11 3818 3675",
      email: "malanzahuerta@gmail.com",
      location: "Palermo, CABA",
    },
    skills: [
      "Comunicación clínica",
      "Adaptación estratégica",
      "Trabajo interdisciplinario",
      "Pensamiento crítico",
      "Herramientas digitales",
      "Inglés avanzado",
    ],
    education: [
      {
        year: "2026",
        title: "Licenciatura en Nutrición",
        place: "Universidad Belgrano · Facultad de ciencias de la salud",
      },
      {
        year: "2025",
        title: "Antropometrista ISAK Nivel 1",
        place: "Certificación avalada por ISAK Iber-Am",
      },
    ],
    experience: [
      {
        year: "2025 – Actualidad",
        role: "Antropometrista",
        company: "Estudio Shine",
        bullets: [
          "Evaluación antropométrica protocolo ISAK.",
          "Análisis de composición corporal y seguimiento de cambios.",
          "Generación de informes y acompañamiento.",
        ],
      },
      {
        year: "2018 – Actualidad",
        role: "Personal Trainer",
        company: "Freelance",
        bullets: [
          "Planificación de entrenamientos individualizados.",
          "Procesos de recomposición corporal.",
          "Integración de hábitos de salud.",
        ],
      },
      {
        year: "Sep 2023 – Dic 2023",
        role: "Prácticas profesionales",
        company: "Hospital de Niños Ricardo Gutiérrez",
        bullets: [],
      },
      {
        year: "Abr 2023 – Jun 2023",
        role: "Prácticas profesionales",
        company: "CESAC N°1",
        bullets: [],
      },
    ],
    est: "2025",
    city: "Buenos Aires, Argentina",
  },
};
