import { unstable_cache, revalidateTag } from "next/cache";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";
import { NUTRICIONISTA_PAGE_SLUG } from "@/types/nutricionista-cv";
import { prisma } from "@/server/db/prisma";

const PUBLIC_CMS_CONTENT_SLUGS = [
  LANDING_IMAGES_SLUG,
  NUTRICIONISTA_PAGE_SLUG,
] as const;

function collectMediaUrls(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    const normalized = value.trim().split(/[?#]/)[0];
    if (
      normalized.startsWith("/api/media/") ||
      normalized.startsWith("/uploads/")
    ) {
      out.add(normalized);
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
    where: { folder: { in: ["site", "cv", "brand"] } },
    select: { url: true },
  });
  for (const asset of assets) {
    const normalized = asset.url.trim().split(/[?#]/)[0];
    if (
      normalized.startsWith("/api/media/") ||
      normalized.startsWith("/uploads/")
    ) {
      urls.add(normalized);
    }
  }

  return [...urls];
}

export const getPublicSiteMediaUrls = unstable_cache(
  loadPublicSiteMediaUrls,
  ["public-site-media-urls"],
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
