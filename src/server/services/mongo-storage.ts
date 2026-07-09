/** Compat: GridFS + resolución local. Preferir imports directos de mongo-gridfs / media-local-resolve. */
export {
  deleteFromMongo,
  getMongoFileMeta,
  gridFileMimeType,
  mediaUrl,
  mongoStreamToWebResponse,
  openGridFsDownloadStream,
  uploadToMongo,
} from "@/server/services/mongo-gridfs";

export {
  findLocalUploadByFileId,
  openLocalMediaStream,
} from "@/server/services/media-local-resolve";

import { findLocalUploadByFileId } from "@/server/services/media-local-resolve";

/** Con fallback Prisma (CMS / rutas que no son GET /api/media). */
export async function findLocalUploadUrl(fileId: string): Promise<{
  url: string;
  folder: string;
} | null> {
  const local = await findLocalUploadByFileId(fileId);
  if (local) return local;

  const { prisma } = await import("@/server/db/prisma");
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      OR: [
        { fileId },
        { url: `/api/media/${fileId}` },
        { url: { contains: fileId } },
      ],
    },
    select: { url: true, folder: true },
  });

  if (asset?.url.startsWith("/uploads/")) {
    return { url: asset.url, folder: asset.folder };
  }

  return null;
}

import { openGridFsDownloadStream } from "@/server/services/mongo-gridfs";
import { openLocalMediaStream } from "@/server/services/media-local-resolve";

/** Abre stream local migrado o GridFS. */
export async function openMongoFileStream(fileId: string) {
  const local = await openLocalMediaStream(fileId);
  if (local) return local;
  return openGridFsDownloadStream(fileId);
}
