export const NAV_MENU_SLUG = "nav_menu";

/**
 * Tipos de destino de una opción del menú del lobby:
 * - section: ancla a una sección de la portada (se hace scroll suave).
 * - page: una página interna del sitio (ej. /nutricionista, /resources).
 * - external: un enlace externo (se abre en pestaña nueva).
 */
export type NavItemType = "section" | "page" | "external";

export interface NavMenuItem {
  id: string;
  label: string;
  type: NavItemType;
  /** section → id de sección; page → ruta interna; external → URL completa. */
  target: string;
  enabled: boolean;
}

export interface NavMenuData {
  items: NavMenuItem[];
}

/** Secciones de la portada disponibles como destino de ancla. */
export const NAV_SECTION_OPTIONS: { id: string; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "paquetes", label: "Paquetes" },
  { id: "contacto", label: "Contacto" },
];

/** Páginas internas disponibles como destino. */
export const NAV_PAGE_OPTIONS: { id: string; label: string }[] = [
  { id: "/nutricionista", label: "Sobre mí" },
  { id: "/resources", label: "Recursos" },
  { id: "/productos", label: "Productos" },
];

export const NAV_ITEM_TYPE_LABELS: Record<NavItemType, string> = {
  section: "Sección de la portada",
  page: "Página del sitio",
  external: "Enlace externo",
};
