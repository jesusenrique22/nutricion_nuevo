import {
  AUTHENTICATED_MEDIA_FOLDERS,
  isPublicMediaFolder,
  isPublicUploadsFolder,
} from "@/lib/media-access-policy";
import { isUploadsPath, parseMediaIdFromUrl } from "@/lib/stored-file";
import { getMongoFileMeta } from "@/server/services/mongo-gridfs";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";
import { NUTRICIONISTA_PAGE_SLUG } from "@/types/nutricionista-cv";
import { PRODUCTS_SLUG } from "@/types/products";

function folderFromUploadPath(url: string): string | null {
  const match = url.match(/^\/uploads\/([^/]+)\//);
  return match?.[1] ?? null;
}

async function isPublishedResourceCover(url: string): Promise<boolean> {
  const { prisma } = await import("@/server/db/prisma");
  const count = await prisma.resource.count({
    where: { isPublished: true, coverUrl: url },
  });
  return count > 0;
}

async function isPublicCmsMediaUrl(url: string): Promise<boolean> {
  const normalized = url.trim().split(/[?#]/)[0];
  const { prisma } = await import("@/server/db/prisma");

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      url: normalized,
      folder: { in: ["site", "cv", "brand", "products"] },
    },
    select: { id: true },
  });
  if (asset) return true;

  const rows = await prisma.siteContent.findMany({
    where: {
      slug: { in: [LANDING_IMAGES_SLUG, NUTRICIONISTA_PAGE_SLUG, PRODUCTS_SLUG] },
    },
    select: { data: true },
  });
  return rows.some((row) => JSON.stringify(row.data).includes(normalized));
}

async function resourceGrantedForUser(
  userId: string,
  contentUrl: string,
): Promise<boolean> {
  const { prisma } = await import("@/server/db/prisma");
  const purchase = await prisma.resourcePurchase.findFirst({
    where: {
      userId,
      status: "GRANTED",
      resource: { contentUrl },
    },
    select: { id: true },
  });
  return Boolean(purchase);
}

async function resolveGridFolder(
  url: string,
  metaFolder?: string | null,
): Promise<string | null> {
  if (metaFolder?.trim()) return metaFolder.trim();

  const mediaId = parseMediaIdFromUrl(url);
  if (!mediaId) {
    const uploadMatch = url.match(/^\/uploads\/([^/]+)\//);
    return uploadMatch?.[1] ?? null;
  }

  const meta = await getMongoFileMeta(mediaId);
  const fromMeta = meta?.metadata as Record<string, unknown> | undefined;
  const folder = fromMeta?.folder;
  if (typeof folder === "string" && folder.trim()) {
    return folder.trim();
  }

  const { prisma } = await import("@/server/db/prisma");
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      OR: [{ url }, { fileId: mediaId }, { url: { contains: mediaId } }],
    },
    select: { folder: true },
  });
  if (asset?.folder) return asset.folder;

  const { findLocalUploadByFileId } = await import(
    "@/server/services/media-local-resolve"
  );
  const located = await findLocalUploadByFileId(mediaId);
  return located?.folder ?? null;
}

export async function isPublicMediaGetUrl(
  url: string,
  metaFolder?: string | null,
): Promise<boolean> {
  if (metaFolder && isPublicMediaFolder(metaFolder)) return true;
  if (await isPublishedResourceCover(url)) return true;
  if (await isPublicCmsMediaUrl(url)) return true;

  const gridFolder = await resolveGridFolder(url, metaFolder);
  if (isPublicMediaFolder(gridFolder)) return true;

  const uploadFolder = isUploadsPath(url) ? folderFromUploadPath(url) : null;
  return isPublicUploadsFolder(uploadFolder);
}

export async function canAccessMediaGetUrl(
  url: string,
  meta?: {
    metadata?: Record<string, unknown>;
  } | null,
): Promise<boolean> {
  const metaFolder =
    typeof meta?.metadata?.folder === "string"
      ? meta.metadata.folder.trim()
      : null;

  if (await isPublicMediaGetUrl(url, metaFolder)) return true;

  const gridFolder = await resolveGridFolder(url, metaFolder);
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) return false;

  if (session.user.role === "ADMIN") return true;
  if (gridFolder && AUTHENTICATED_MEDIA_FOLDERS.has(gridFolder)) return true;

  const ownerId = meta?.metadata?.ownerId;
  if (gridFolder === "payment-proofs") {
    return typeof ownerId === "string" && ownerId === session.user.id;
  }

  if (gridFolder === "resources") {
    return resourceGrantedForUser(session.user.id, url);
  }

  const mediaId = parseMediaIdFromUrl(url);
  if (!mediaId) {
    if (isUploadsPath(url)) {
      const folder = folderFromUploadPath(url);
      if (folder === "resources") {
        return resourceGrantedForUser(session.user.id, url);
      }
    }
    return false;
  }

  if (!meta) {
    const { prisma } = await import("@/server/db/prisma");
    if (gridFolder === "payment-proofs") {
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          OR: [{ fileId: mediaId }, { url: { contains: mediaId } }],
        },
        select: { ownerId: true },
      });
      return asset?.ownerId === session.user.id;
    }
    if (gridFolder === "resources") {
      return resourceGrantedForUser(session.user.id, url);
    }
    return AUTHENTICATED_MEDIA_FOLDERS.has(gridFolder ?? "");
  }

  return false;
}
