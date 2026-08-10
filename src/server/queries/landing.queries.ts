import { cache } from "react";
import { unstable_cache } from "next/cache";
import { DEFAULT_LANDING_BLOCKS } from "@/lib/landing-blocks-defaults";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { mergeLandingImages } from "@/lib/landing-images-parse";
import { mergeLandingBlocks } from "@/lib/landing-blocks-parse";
import { DEFAULT_NAV_MENU, mergeNavMenu } from "@/lib/nav-menu-parse";
import { DEFAULT_PRODUCTS, mergeProducts } from "@/lib/products-parse";
import { prisma } from "@/server/db/prisma";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";
import type { LandingBlocksData } from "@/types/landing-blocks";
import { LANDING_BLOCKS_SLUG } from "@/types/landing-blocks";
import type { NavMenuData } from "@/types/nav-menu";
import { NAV_MENU_SLUG } from "@/types/nav-menu";
import type { ProductsData } from "@/types/products";
import { PRODUCTS_SLUG } from "@/types/products";
import type { Prisma } from "@prisma/client";

function logCmsFallback(label: string, error: unknown) {
  console.error(`[cms] ${label} falló; usando defaults`, error);
}

/** Tags de caché para invalidar al guardar contenido CMS. */
export const CMS_CACHE_TAG = "cms-site-content";

function asSiteJson(
  data: Prisma.JsonValue | null | undefined,
): Record<string, unknown> | null | undefined {
  if (data === null || data === undefined) return data;
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return undefined;
}

/** Consulta directa con select mínimo — sin pasar por la Server Action de CMS. */
async function fetchSiteContent(
  slug: string,
): Promise<{ data: Prisma.JsonValue } | null> {
  return prisma.siteContent.findUnique({
    where: { slug },
    select: { data: true },
  });
}

// ── Caché persistente entre requests (5 min TTL + invalidación por tag) ──────

const fetchLandingImages = unstable_cache(
  async (): Promise<LandingImagesData> => {
    const row = await fetchSiteContent(LANDING_IMAGES_SLUG);
    return mergeLandingImages(asSiteJson(row?.data));
  },
  ["landing-images", "v2"],
  { revalidate: 300, tags: [CMS_CACHE_TAG, "landing-images"] },
);

const fetchLandingBlocks = unstable_cache(
  async (): Promise<LandingBlocksData> => {
    const [blockRow, images] = await Promise.all([
      fetchSiteContent(LANDING_BLOCKS_SLUG),
      fetchLandingImages(),
    ]);
    return mergeLandingBlocks(asSiteJson(blockRow?.data), images);
  },
  ["landing-blocks", "v2"],
  { revalidate: 300, tags: [CMS_CACHE_TAG, "landing-blocks"] },
);

const fetchNavMenu = unstable_cache(
  async (): Promise<NavMenuData> => {
    const row = await fetchSiteContent(NAV_MENU_SLUG);
    return mergeNavMenu(asSiteJson(row?.data));
  },
  ["nav-menu"],
  { revalidate: 300, tags: [CMS_CACHE_TAG, "nav-menu"] },
);

const fetchProducts = unstable_cache(
  async (): Promise<ProductsData> => {
    const row = await fetchSiteContent(PRODUCTS_SLUG);
    return mergeProducts(asSiteJson(row?.data));
  },
  ["products"],
  { revalidate: 300, tags: [CMS_CACHE_TAG, "products"] },
);

// ── Wrappers fail-safe + deduplicación por request (React cache) ─────────────
// Si Neon/Prisma falla, devolvemos defaults para que marketing no se caiga.

export const getLandingImages = cache(async (): Promise<LandingImagesData> => {
  try {
    return await fetchLandingImages();
  } catch (error) {
    logCmsFallback("getLandingImages", error);
    return DEFAULT_LANDING_IMAGES;
  }
});

export const getLandingBlocks = cache(async (): Promise<LandingBlocksData> => {
  try {
    return await fetchLandingBlocks();
  } catch (error) {
    logCmsFallback("getLandingBlocks", error);
    return DEFAULT_LANDING_BLOCKS;
  }
});

export const getNavMenu = cache(async (): Promise<NavMenuData> => {
  try {
    return await fetchNavMenu();
  } catch (error) {
    logCmsFallback("getNavMenu", error);
    return DEFAULT_NAV_MENU;
  }
});

export const getProducts = cache(async (): Promise<ProductsData> => {
  try {
    return await fetchProducts();
  } catch (error) {
    logCmsFallback("getProducts", error);
    return DEFAULT_PRODUCTS;
  }
});
