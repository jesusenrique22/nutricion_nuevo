import { auth } from "@/lib/auth";
import {
  AUTHENTICATED_MEDIA_FOLDERS,
  isPublicMediaFolder,
  isPublicUploadsFolder,
  PUBLIC_MEDIA_FOLDERS,
} from "@/lib/media-access-policy";
import { isPublicSiteContentMedia } from "@/lib/public-site-media";
import { isUploadsPath, parseMediaIdFromUrl } from "@/lib/stored-file";
import { getMongoFileMeta } from "@/server/services/mongo-storage";
import { prisma } from "@/server/db/prisma";

function folderFromUploadPath(url: string): string | null {
  const match = url.match(/^\/uploads\/([^/]+)\//);
  return match?.[1] ?? null;
}

async function resolveGridFolder(url: string): Promise<string | null> {
  const mediaId = parseMediaIdFromUrl(url);
  if (!mediaId) return null;

  const meta = await getMongoFileMeta(mediaId);
  const metadata = meta?.metadata as Record<string, unknown> | undefined;
  const fromMeta = metadata?.folder;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      OR: [{ url }, { fileId: mediaId }],
    },
    select: { folder: true },
  });

  return asset?.folder ?? null;
}

async function isPublishedResourceCover(url: string): Promise<boolean> {
  const count = await prisma.resource.count({
    where: { isPublished: true, coverUrl: url },
  });
  return count > 0;
}

async function resourceGrantedForUser(
  userId: string,
  contentUrl: string,
): Promise<boolean> {
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

async function isPublicMediaUrl(url: string): Promise<boolean> {
  if (await isPublishedResourceCover(url)) return true;
  if (await isPublicSiteContentMedia(url)) return true;

  const gridFolder = await resolveGridFolder(url);
  if (isPublicMediaFolder(gridFolder)) return true;

  const uploadFolder = isUploadsPath(url) ? folderFromUploadPath(url) : null;
  return isPublicUploadsFolder(uploadFolder);
}

/** Acceso a archivos en GridFS o /uploads según carpeta y rol. */
export async function canAccessStoredMediaUrl(url: string): Promise<boolean> {
  if (await isPublicMediaUrl(url)) return true;

  const gridFolder = await resolveGridFolder(url);

  const session = await auth();
  if (!session?.user?.id) return false;

  const isAdmin = session.user.role === "ADMIN";
  if (isAdmin) return true;

  if (gridFolder && AUTHENTICATED_MEDIA_FOLDERS.has(gridFolder)) return true;

  const mediaId = parseMediaIdFromUrl(url);
  if (mediaId) {
    const folder = gridFolder ?? "";
    const meta = await getMongoFileMeta(mediaId);
    if (!meta) return false;
    const metadata = meta.metadata as Record<string, unknown> | undefined;
    const ownerId = metadata?.ownerId as string | undefined;

    if (folder === "payment-proofs") {
      return ownerId === session.user.id;
    }

    if (folder === "resources") {
      return resourceGrantedForUser(session.user.id, url);
    }

    return false;
  }

  if (isUploadsPath(url)) {
    const folder = folderFromUploadPath(url);
    if (folder === "payment-proofs") return isAdmin;
    if (folder === "resources") {
      return resourceGrantedForUser(session.user.id, url);
    }
  }

  return false;
}

export async function isPublicStoredMediaUrl(url: string): Promise<boolean> {
  return isPublicMediaUrl(url);
}

export async function canAccessResourceContent(
  resourceId: string,
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  if (session.user.role === "ADMIN") return true;

  const purchase = await prisma.resourcePurchase.findUnique({
    where: {
      userId_resourceId: {
        userId: session.user.id,
        resourceId,
      },
    },
    select: { status: true },
  });

  return purchase?.status === "GRANTED";
}

export async function canAccessResourceVideo(
  resourceId: string,
  videoUrl: string,
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  if (session.user.role === "ADMIN") return true;

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { videoUrl: true },
  });
  if (!resource?.videoUrl || resource.videoUrl !== videoUrl) return false;

  return canAccessResourceContent(resourceId);
}

// Re-export for tests / policy introspection
export { PUBLIC_MEDIA_FOLDERS };
