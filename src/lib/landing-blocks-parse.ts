import { DEFAULT_LANDING_BLOCKS } from "@/lib/landing-blocks-defaults";
import type {
  BannerBlock,
  BannerLayout,
  CarouselBlock,
  CarouselItem,
  CarouselSize,
  LandingBlock,
  LandingBlockPlacement,
  LandingBlocksData,
} from "@/types/landing-blocks";
import type { LandingImagesData } from "@/types/landing-images";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function parsePlacement(value: unknown): LandingBlockPlacement {
  switch (value) {
    case "after_hero":
    case "after_services":
    case "after_packages":
    case "before_footer":
      return value;
    default:
      return "after_hero";
  }
}

function parseSize(value: unknown): CarouselSize {
  return value === "sm" || value === "lg" ? value : "md";
}

function parseLayout(value: unknown): BannerLayout {
  return value === "image-left" || value === "image-background"
    ? value
    : "image-right";
}

function parseCarouselItems(value: unknown): CarouselItem[] {
  if (!Array.isArray(value)) return [];
  const items: CarouselItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isNonEmptyString(row.src) || !isNonEmptyString(row.alt)) continue;
    items.push({
      src: row.src,
      alt: row.alt,
      caption: isNonEmptyString(row.caption) ? row.caption : undefined,
    });
  }
  return items;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseBlock(value: unknown): LandingBlock | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const enabled = row.enabled !== false;
  const placement = parsePlacement(row.placement);
  const id = isNonEmptyString(row.id) ? row.id : generateId("block");

  if (row.kind === "carousel") {
    const items = parseCarouselItems(row.items);
    if (items.length === 0) return null;
    const block: CarouselBlock = {
      id,
      kind: "carousel",
      enabled,
      placement,
      title: asString(row.title),
      reverse: row.reverse === true,
      size: parseSize(row.size),
      items,
    };
    return block;
  }

  if (row.kind === "banner") {
    if (!isNonEmptyString(row.imageSrc) && !isNonEmptyString(row.title)) {
      return null;
    }
    const block: BannerBlock = {
      id,
      kind: "banner",
      enabled,
      placement,
      eyebrow: asString(row.eyebrow),
      title: asString(row.title),
      text: asString(row.text),
      imageSrc: asString(row.imageSrc),
      imageAlt: asString(row.imageAlt),
      ctaLabel: asString(row.ctaLabel),
      ctaHref: asString(row.ctaHref),
      layout: parseLayout(row.layout),
    };
    return block;
  }

  return null;
}

function parseBlocks(value: unknown): LandingBlock[] | null {
  if (!Array.isArray(value)) return null;
  const blocks: LandingBlock[] = [];
  for (const item of value) {
    const block = parseBlock(item);
    if (block) blocks.push(block);
  }
  return blocks.length > 0 ? blocks : null;
}

/**
 * Migra la galería de fotos del sitio (landing_images.gallery) a bloques de
 * carrusel del inicio, replicando las dos franjas que existían antes.
 */
function migrateFromImages(images: LandingImagesData | null): LandingBlock[] | null {
  const gallery = images?.gallery;
  if (!gallery?.length) return null;

  const items: CarouselItem[] = gallery
    .filter((item) => isNonEmptyString(item.src))
    .map((item) => ({ src: item.src, alt: item.alt }));
  if (items.length === 0) return null;

  const blocks: CarouselBlock[] = [
    {
      id: generateId("carousel-hero"),
      kind: "carousel",
      enabled: true,
      placement: "after_hero",
      title: "Balance · Energía · Bienestar",
      reverse: false,
      size: "md",
      items,
    },
    {
      id: generateId("carousel-footer"),
      kind: "carousel",
      enabled: true,
      placement: "before_footer",
      title: "Comunidad · Constancia · Evolución",
      reverse: true,
      size: "md",
      items,
    },
  ];
  return blocks;
}

export function mergeLandingBlocks(
  stored: Record<string, unknown> | null | undefined,
  fallbackImages?: LandingImagesData | null,
): LandingBlocksData {
  const parsed = stored ? parseBlocks(stored.blocks) : null;
  if (parsed) return { blocks: parsed };

  const migrated = migrateFromImages(fallbackImages ?? null);
  if (migrated) return { blocks: migrated };

  return DEFAULT_LANDING_BLOCKS;
}

export function landingBlocksToRecord(
  data: LandingBlocksData,
): Record<string, unknown> {
  return { blocks: data.blocks };
}
