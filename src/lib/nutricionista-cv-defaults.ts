import type { NutricionistaPageData } from "@/types/nutricionista-cv";
import { BRAND_PROFILE } from "@/lib/brand-assets";

export const DEFAULT_NUTRICIONISTA_PAGE: NutricionistaPageData = {
  pageTitle: "Conoceme más",
  pageDescription:
    "Lic. Ma Antonieta Lanza — nutrición, antropometría ISAK y entrenamiento personalizado con enfoque integral.",
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
