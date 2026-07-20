import { unstable_cache, revalidateTag } from "next/cache";
import { PUBLIC_MEDIA_FOLDERS } from "@/lib/media-access-policy";
import { AUTH_BRANDING_SLUG } from "@/types/auth-branding";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";
import { NUTRICIONISTA_PAGE_SLUG } from "@/types/nutricionista-cv";
import { PRODUCTS_SLUG } from "@/types/products";
import { prisma } from "@/server/db/prisma";

const PUBLIC_CMS_CONTENT_SLUGS = [
  LANDING_IMAGES_SLUG,
  NUTRICIONISTA_PAGE_SLUG,
  PRODUCTS_SLUG,
  AUTH_BRANDING_SLUG,
] as const;

function addPublicMediaUrl(out: Set<string>, normalized: string): void {
  out.add(normalized);

  // HTML cacheado puede seguir pidiendo /api/media/{id} tras migrar a /uploads/.
  const migrated = normalized.match(
    /^\/uploads\/(site|brand|auth|cv|products|packages)\/([a-f0-9]{24})\.[^/]+$/i,
  );
  if (migrated) {
    out.add(`/api/media/${migrated[2]}`);
  }
}

function collectMediaUrls(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    const normalized = value.trim().split(/[?#]/)[0];
    if (
      normalized.startsWith("/api/media/") ||
      normalized.startsWith("/uploads/")
    ) {
      addPublicMediaUrl(out, normalized);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectMediaUrls(item, out);
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectMediaUrls(item, out);
  }
}

async function loadPublicSiteMediaUrls(): Promise<string[]> {
  const urls = new Set<string>();

  const rows = await prisma.siteContent.findMany({
    where: { slug: { in: [...PUBLIC_CMS_CONTENT_SLUGS] } },
    select: { data: true },
  });

  for (const row of rows) {
    collectMediaUrls(row.data, urls);
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { folder: { in: [...PUBLIC_MEDIA_FOLDERS] } },
    select: { url: true },
  });
  for (const asset of assets) {
    const normalized = asset.url.trim().split(/[?#]/)[0];
    if (
      normalized.startsWith("/api/media/") ||
      normalized.startsWith("/uploads/")
    ) {
      addPublicMediaUrl(urls, normalized);
    }
  }

  // Fotos propias de paquetes publicados (no viven en SiteContent JSON).
  const packageImages = await prisma.consultationType.findMany({
    where: { isPublished: true, imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  for (const row of packageImages) {
    if (row.imageUrl) collectMediaUrls(row.imageUrl, urls);
  }

  return [...urls];
}

export const getPublicSiteMediaUrls = unstable_cache(
  loadPublicSiteMediaUrls,
  ["public-site-media-urls", "v6"],
  { revalidate: 300, tags: ["public-site-media"] },
);

export async function isPublicSiteContentMedia(url: string): Promise<boolean> {
  const normalized = url.trim().split(/[?#]/)[0];
  const urls = await getPublicSiteMediaUrls();
  return urls.includes(normalized);
}

export function revalidatePublicSiteMediaCache(): void {
  revalidateTag("public-site-media", "max");
}
