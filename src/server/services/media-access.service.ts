import { auth } from "@/lib/auth";
import {
  AUTHENTICATED_MEDIA_FOLDERS,
  isPublicMediaFolder,
  isPublicUploadsFolder,
  PUBLIC_MEDIA_FOLDERS,
} from "@/lib/media-access-policy";
import { isPublicSiteContentMedia } from "@/lib/public-site-media";
import { isUploadsPath, parseMediaIdFromUrl } from "@/lib/stored-file";
import { getMongoFileMeta, findLocalUploadUrl } from "@/server/services/mongo-storage";
import { prisma } from "@/server/db/prisma";

function folderFromUploadPath(url: string): string | null {
  const match = url.match(/^\/uploads\/([^/]+)\//);
  return match?.[1] ?? null;
}

async function resolveGridFolder(url: string): Promise<string | null> {
  const mediaId = parseMediaIdFromUrl(url);
  if (!mediaId) {
    const uploadMatch = url.match(/^\/uploads\/([^/]+)\//);
    return uploadMatch?.[1] ?? null;
  }

  const meta = await getMongoFileMeta(mediaId);
  const metadata = meta?.metadata as Record<string, unknown> | undefined;
  const fromMeta = metadata?.folder;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      OR: [{ url }, { fileId: mediaId }, { url: { contains: mediaId } }],
    },
    select: { folder: true },
  });

  if (asset?.folder) return asset.folder;

  const located = await findLocalUploadUrl(mediaId);
  if (located?.folder) return located.folder;

  const uploadMatch = url.match(/^\/uploads\/([^/]+)\//);
  return uploadMatch?.[1] ?? null;
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
  const mediaId = parseMediaIdFromUrl(url);
  if (mediaId) {
    const located = await findLocalUploadUrl(mediaId);
    if (located && isPublicMediaFolder(located.folder)) return true;
  }

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
    const folder =
      gridFolder ?? (await findLocalUploadUrl(mediaId))?.folder ?? "";
    const meta = await getMongoFileMeta(mediaId);
    if (!meta) {
      if (folder === "payment-proofs") {
        const asset = await prisma.mediaAsset.findFirst({
          where: {
            OR: [
              { fileId: mediaId },
              { url: { contains: mediaId } },
            ],
          },
          select: { ownerId: true },
        });
        return asset?.ownerId === session.user.id;
      }
      if (folder === "resources") {
        return resourceGrantedForUser(session.user.id, url);
      }
      if (AUTHENTICATED_MEDIA_FOLDERS.has(folder)) return true;
      return false;
    }
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
