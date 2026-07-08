import { BRAND_LIFESTYLE } from "@/lib/brand-assets";
import type { CarouselItem, LandingBlocksData } from "@/types/landing-blocks";

const DEFAULT_CAROUSEL_ITEMS: CarouselItem[] = [
  { src: BRAND_LIFESTYLE.community, alt: "Comunidad Anttova" },
  { src: BRAND_LIFESTYLE.running, alt: "Movimiento diario" },
  { src: BRAND_LIFESTYLE.yogaSky, alt: "Flexibilidad y bienestar" },
  { src: BRAND_LIFESTYLE.nutritionBowl, alt: "Nutrición consciente" },
  { src: BRAND_LIFESTYLE.stretch, alt: "Disciplina y constancia" },
];

export const DEFAULT_LANDING_BLOCKS: LandingBlocksData = {
  blocks: [
    {
      id: "carousel-balance",
      kind: "carousel",
      enabled: true,
      placement: "after_hero",
      title: "Balance · Energía · Bienestar",
      reverse: false,
      size: "md",
      items: DEFAULT_CAROUSEL_ITEMS,
    },
    {
      id: "carousel-comunidad",
      kind: "carousel",
      enabled: true,
      placement: "before_footer",
      title: "Comunidad · Constancia · Evolución",
      reverse: true,
      size: "md",
      items: DEFAULT_CAROUSEL_ITEMS,
    },
  ],
};
