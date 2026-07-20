import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isMongoConfigured, tryGetMongoDb } from "@/server/db/mongo";
import { optimizeImageBufferForFolder } from "@/server/services/image-optimize";
import { uploadToMongo } from "@/server/services/mongo-storage";

export type StoredFile = {
  url: string;
  mimeType: string;
  provider: "mongodb" | "local";
  fileId?: string;
};

function hasMongoUri(): boolean {
  return isMongoConfigured();
}

function requiresPersistentStorage(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

async function prepareUpload(
  file: File,
  folder: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const original = Buffer.from(await file.arrayBuffer());
  const optimized = await optimizeImageBufferForFolder(
    original,
    folder,
    file.type || "application/octet-stream",
  );

  if (!optimized) {
    return {
      buffer: original,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name,
    };
  }

  const stem = file.name.replace(/\.[^.]+$/, "") || "imagen";
  return {
    buffer: optimized.buffer,
    mimeType: optimized.mimeType,
    fileName: `${stem}${optimized.ext}`,
  };
}

async function storeLocalBuffer(
  buffer: Buffer,
  folder: string,
  fileName: string,
  mimeType: string,
): Promise<StoredFile> {
  const ext = path.extname(fileName) || "";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const relDir = path.join("uploads", folder);
  const absDir = path.join(process.cwd(), "public", relDir);

  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, safeName), buffer);

  const publicUrl = `/${relDir.replace(/\\/g, "/")}/${safeName}`;
  return { url: publicUrl, mimeType, provider: "local" };
}

export async function storePublicFile(
  file: File,
  folder: string,
  options?: { ownerId?: string },
): Promise<StoredFile> {
  const prepared = await prepareUpload(file, folder);

  if (hasMongoUri() && (await tryGetMongoDb())) {
    try {
      const uploaded = await uploadToMongo(prepared.buffer, {
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        folder,
        ownerId: options?.ownerId,
      });
      return {
        url: uploaded.url,
        mimeType: prepared.mimeType,
        provider: "mongodb",
        fileId: uploaded.fileId,
      };
    } catch (err) {
      if (requiresPersistentStorage()) throw err;
      console.warn(
        "[storage] MongoDB no disponible, usando almacenamiento local:",
        err instanceof Error ? err.message : err,
      );
    }
  } else if (hasMongoUri() && requiresPersistentStorage()) {
    throw new Error(
      "MongoDB no está disponible. Revisá MONGODB_URI y Atlas.",
    );
  } else if (requiresPersistentStorage()) {
    throw new Error(
      "MONGODB_URI no está configurado. Es necesario para subir archivos en producción.",
    );
  }

  return storeLocalBuffer(
    prepared.buffer,
    folder,
    prepared.fileName,
    prepared.mimeType,
  );
}
