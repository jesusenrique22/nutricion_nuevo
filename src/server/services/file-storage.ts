import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadToMongo } from "@/server/services/mongo-storage";

export type StoredFile = {
  url: string;
  mimeType: string;
  provider: "mongodb" | "local";
  fileId?: string;
};

function hasMongoUri(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

async function storeLocalFile(
  file: File,
  folder: string,
): Promise<StoredFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const relDir = path.join("uploads", folder);
  const absDir = path.join(process.cwd(), "public", relDir);

  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, safeName), buffer);

  const publicUrl = `/${relDir.replace(/\\/g, "/")}/${safeName}`;
  return { url: publicUrl, mimeType: file.type, provider: "local" };
}

export async function storePublicFile(
  file: File,
  folder: string,
  options?: { ownerId?: string },
): Promise<StoredFile> {
  if (hasMongoUri()) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadToMongo(buffer, {
        fileName: file.name,
        mimeType: file.type,
        folder,
        ownerId: options?.ownerId,
      });
      return {
        url: uploaded.url,
        mimeType: file.type,
        provider: "mongodb",
        fileId: uploaded.fileId,
      };
    } catch (err) {
      if (process.env.VERCEL === "1") throw err;
      console.warn(
        "[storage] MongoDB no disponible, usando almacenamiento local:",
        err instanceof Error ? err.message : err,
      );
    }
  } else if (process.env.VERCEL === "1") {
    throw new Error(
      "MONGODB_URI no está configurado. Es necesario para subir archivos en producción.",
    );
  }

  return storeLocalFile(file, folder);
}
