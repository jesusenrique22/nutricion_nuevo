/** Etiquetas amigables para el panel de personalización (sin jerga técnica). */

const SITE_BLOCK_LABELS: Record<string, string> = {
  landing_hero: "Portada principal",
  landing_packages: "Paquetes y precios",
  landing_about: "Sobre la nutricionista",
  landing_images: "Imágenes del sitio",
  nutricionista_page: "Conóceme más",
  payment_chat_policy: "Pagos y chat",
};

/** Por bloque (slug) y clave del campo. */
const SITE_FIELD_LABELS: Record<string, Record<string, string>> = {
  landing_hero: {
    headline: "Título principal",
    subheadline: "Subtítulo",
    ctaLabel: "Texto del botón principal",
    ctaHref: "Enlace del botón principal",
  },
  landing_packages: {
    nutPrice: "Precio — Consulta nutricional",
    entPrice: "Precio — Entrenamiento",
    antPrice: "Precio — Antropometría",
    currencyNote: "Nota sobre moneda",
  },
  landing_about: {
    name: "Nombre completo",
    bio: "Presentación breve",
  },
};

const SITE_FIELD_HINTS: Record<string, Record<string, string>> = {
  landing_hero: {
    ctaHref: "Ej: /register para registro o /login para ingresar",
    ctaLabel: "Ej: Agendar consulta, Empezar ahora",
  },
  landing_packages: {
    nutPrice: "Se muestra en la landing si no usás solo el CMS de precios",
    currencyNote: "Ej: Precios en pesos argentinos",
  },
};

/** Etiquetas globales por clave (fallback). */
const GLOBAL_FIELD_LABELS: Record<string, string> = {
  headline: "Título principal",
  subheadline: "Subtítulo",
  ctaLabel: "Texto del botón",
  ctaHref: "Enlace del botón",
  name: "Nombre",
  bio: "Biografía",
  title: "Título",
  description: "Descripción",
  body: "Contenido",
  url: "Enlace web",
  email: "Correo electrónico",
  phone: "Teléfono",
};

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function siteBlockLabel(slug: string, storedTitle?: string | null): string {
  return SITE_BLOCK_LABELS[slug] ?? storedTitle ?? humanizeKey(slug);
}

export function siteFieldLabel(slug: string, key: string): string {
  return (
    SITE_FIELD_LABELS[slug]?.[key] ??
    GLOBAL_FIELD_LABELS[key] ??
    humanizeKey(key)
  );
}

export function siteFieldHint(slug: string, key: string): string | undefined {
  return SITE_FIELD_HINTS[slug]?.[key];
}

export const LANDING_IMAGE_SECTION_LABELS = {
  hero: "Carrusel de portada",
  gallery: "Galería de fotos",
  plans: "Imágenes de paquetes",
  services: "Imágenes de servicios",
  other: "Otras imágenes",
} as const;
