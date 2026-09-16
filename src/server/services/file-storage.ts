import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isMongoConfigured, tryGetMongoDbWithin } from "@/server/db/mongo";
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

/** Deja margen dentro del maxDuration de 60 s para guardar y responder. */
const MONGO_UPLOAD_DEADLINE_MS = 20_000;

export type PreparedUpload = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

/**
 * Lee el archivo una sola vez y normaliza imágenes a un formato web seguro.
 * Se exporta para que quien suba pueda inspeccionar los bytes (p. ej. validar
 * la cabecera %PDF-) sin volver a leer el File.
 */
export async function prepareUpload(
  file: File,
  folder: string,
): Promise<PreparedUpload> {
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

export async function storePublicBuffer(
  buffer: Buffer,
  folder: string,
  options: {
    fileName: string;
    mimeType: string;
    ownerId?: string;
  },
): Promise<StoredFile> {
  // Techo de espera: más allá de esto, la función serverless se corta sola y
  // quien sube el archivo se queda mirando "Subiendo…" sin saber por qué.
  if (hasMongoUri() && (await tryGetMongoDbWithin(MONGO_UPLOAD_DEADLINE_MS))) {
    try {
      const uploaded = await uploadToMongo(buffer, {
        fileName: options.fileName,
        mimeType: options.mimeType,
        folder,
        ownerId: options.ownerId,
      });
      return {
        url: uploaded.url,
        mimeType: options.mimeType,
        provider: "mongodb",
        fileId: uploaded.fileId,
      };
    } catch (err) {
      if (requiresPersistentStorage()) {
        const message =
          err instanceof Error ? err.message : "Error de almacenamiento";
        throw new Error(
          message.includes("MongoDB") || message.includes("almacenamiento")
            ? message
            : "No pudimos guardar el archivo en la nube. Verificá MongoDB Atlas (cluster activo y Network Access).",
        );
      }
      console.warn(
        "[storage] MongoDB no disponible, usando almacenamiento local:",
        err instanceof Error ? err.message : err,
      );
    }
  } else if (hasMongoUri() && requiresPersistentStorage()) {
    throw new Error(
      "No pudimos guardar el archivo. MongoDB no responde — verificá Atlas (cluster activo, IP 0.0.0.0/0).",
    );
  } else if (requiresPersistentStorage()) {
    throw new Error(
      "No pudimos guardar el archivo. Configurá MONGODB_URI en Vercel.",
    );
  }

  return storeLocalBuffer(
    buffer,
    folder,
    options.fileName,
    options.mimeType,
  );
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
  return storePublicBuffer(prepared.buffer, folder, {
    fileName: prepared.fileName,
    mimeType: prepared.mimeType,
    ownerId: options?.ownerId,
  });
}
