"use server";

import { quickStoredFileLabel } from "@/lib/stored-file-label";
import {
  normalizeStoredUrl,
  parseMediaIdFromUrl,
} from "@/lib/stored-file-url";
import { getMongoFileMeta } from "@/server/services/mongo-storage";
import { prisma } from "@/server/db/prisma";

/** Nombre legible para mostrar al admin (p. ej. guia-nutricion.pdf). */
export async function resolveStoredFileLabel(
  url: string,
): Promise<string> {
  const normalized = normalizeStoredUrl(url).trim();
  if (!normalized) return "documento.pdf";

  const quick = quickStoredFileLabel(normalized);
  if (!normalized.startsWith("/api/media/")) {
    return quick;
  }

  const mediaId = parseMediaIdFromUrl(normalized);
  if (!mediaId) return quick;

  const asset = await prisma.mediaAsset.findFirst({
    where: {
      OR: [
        { fileId: mediaId },
        { url: normalized },
        { url: { contains: mediaId } },
      ],
    },
    select: { fileName: true },
    orderBy: { createdAt: "desc" },
  });
  if (asset?.fileName?.trim()) {
    return asset.fileName.trim();
  }

  const meta = await getMongoFileMeta(mediaId);
  const fromGrid = meta?.filename?.trim();
  if (fromGrid) return fromGrid;

  return "documento.pdf";
}
