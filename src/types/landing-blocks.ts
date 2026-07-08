export const LANDING_BLOCKS_SLUG = "landing_blocks";

export type LandingBlockPlacement =
  | "after_hero"
  | "after_services"
  | "after_packages"
  | "before_footer";

export const LANDING_BLOCK_PLACEMENTS: {
  id: LandingBlockPlacement;
  label: string;
}[] = [
  { id: "after_hero", label: "Después del carrusel principal" },
  { id: "after_services", label: "Después de la sección de servicios" },
  { id: "after_packages", label: "Después de paquetes" },
  { id: "before_footer", label: "Antes del pie de página" },
];

export type CarouselSize = "sm" | "md" | "lg";

export const CAROUSEL_SIZE_LABELS: Record<CarouselSize, string> = {
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
};

export interface CarouselItem {
  src: string;
  alt: string;
  caption?: string;
}

export interface CarouselBlock {
  id: string;
  kind: "carousel";
  enabled: boolean;
  placement: LandingBlockPlacement;
  title: string;
  reverse: boolean;
  size: CarouselSize;
  items: CarouselItem[];
}

export type BannerLayout = "image-right" | "image-left" | "image-background";

export const BANNER_LAYOUT_LABELS: Record<BannerLayout, string> = {
  "image-right": "Imagen a la derecha",
  "image-left": "Imagen a la izquierda",
  "image-background": "Imagen de fondo",
};

export interface BannerBlock {
  id: string;
  kind: "banner";
  enabled: boolean;
  placement: LandingBlockPlacement;
  eyebrow: string;
  title: string;
  text: string;
  imageSrc: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
  layout: BannerLayout;
}

export type LandingBlock = CarouselBlock | BannerBlock;
export type LandingBlockKind = LandingBlock["kind"];

export const LANDING_BLOCK_KIND_LABELS: Record<LandingBlockKind, string> = {
  carousel: "Carrusel de fotos",
  banner: "Banner con imagen y texto",
};

export interface LandingBlocksData {
  blocks: LandingBlock[];
}
