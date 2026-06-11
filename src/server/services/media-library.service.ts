import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/prisma";
import { deleteFromMongo } from "@/server/services/mongo-storage";
import type { StoredFile } from "@/server/services/file-storage";

export async function registerMediaAsset(
  stored: StoredFile,
  options: {
    folder: string;
    fileName?: string;
    ownerId?: string;
  },
) {
  return prisma.mediaAsset.create({
    data: {
      url: stored.url,
      fileId: stored.fileId ?? null,
      mimeType: stored.mimeType,
      fileName: options.fileName ?? null,
      folder: options.folder,
      provider: stored.provider,
      ownerId: options.ownerId ?? null,
    },
  });
}

export async function listMediaAssets(folder: string) {
  return prisma.mediaAsset.findMany({
    where: {
      folder,
      mimeType: { startsWith: "image/" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      mimeType: true,
      fileName: true,
      createdAt: true,
    },
  });
}

async function unlinkLocalPublicFile(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const absPath = path.join(process.cwd(), "public", url.slice(1));
  try {
    await unlink(absPath);
  } catch {
    // archivo ya eliminado o inexistente
  }
}

export async function deleteMediaAsset(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return null;

  if (asset.provider === "mongodb" && asset.fileId) {
    try {
      await deleteFromMongo(asset.fileId);
    } catch (err) {
      console.warn("[media-library] No se pudo borrar de MongoDB:", err);
    }
  } else if (asset.provider === "local") {
    await unlinkLocalPublicFile(asset.url);
  }

  await prisma.mediaAsset.delete({ where: { id } });
  return asset;
}
