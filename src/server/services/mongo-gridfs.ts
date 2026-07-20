import { GridFSBucket, ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { tryGetMongoDb, tryGetMongoDbFast } from "@/server/db/mongo";

const BUCKET = "media";

export function mediaUrl(fileId: string): string {
  return `/api/media/${fileId}`;
}

export async function uploadToMongo(
  buffer: Buffer,
  options: {
    fileName: string;
    mimeType: string;
    folder: string;
    ownerId?: string;
  },
): Promise<{ fileId: string; url: string }> {
  const db = await tryGetMongoDb();
  if (!db) {
    throw new Error("MongoDB no disponible");
  }
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });

  const fileId = await new Promise<ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(options.fileName, {
      metadata: {
        mimeType: options.mimeType,
        folder: options.folder,
        ownerId: options.ownerId ?? null,
      },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id as ObjectId));
    stream.end(buffer);
  });

  const id = fileId.toString();
  return { fileId: id, url: mediaUrl(id) };
}

async function resolveMongoDb() {
  const fast = await tryGetMongoDbFast();
  if (fast) return fast;
  return tryGetMongoDb();
}

export async function getMongoFileMeta(fileId: string) {
  if (!ObjectId.isValid(fileId)) return null;
  const db = await resolveMongoDb();
  if (!db) return null;
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const files = await bucket
    .find({ _id: new ObjectId(fileId) })
    .limit(1)
    .toArray();
  return files[0] ?? null;
}

export async function openGridFsDownloadStream(fileId: string) {
  if (!ObjectId.isValid(fileId)) return null;
  const db = await resolveMongoDb();
  if (!db) return null;
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const files = await bucket
    .find({ _id: new ObjectId(fileId) })
    .limit(1)
    .toArray();
  const meta = files[0] ?? null;
  if (!meta) return null;
  const stream = bucket.openDownloadStream(new ObjectId(fileId));
  return { stream, meta };
}

export async function deleteFromMongo(fileId: string): Promise<boolean> {
  if (!ObjectId.isValid(fileId)) return false;
  const db = await tryGetMongoDb();
  if (!db) return false;
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const files = await bucket
    .find({ _id: new ObjectId(fileId) })
    .limit(1)
    .toArray();
  if (!files[0]) return false;
  await bucket.delete(new ObjectId(fileId));
  return true;
}

/** Reemplaza el binario en GridFS manteniendo el mismo id (URLs CMS intactas). */
export async function replaceMongoFileInPlace(
  fileId: string,
  buffer: Buffer,
  options: {
    fileName: string;
    mimeType: string;
    folder: string;
    ownerId?: string | null;
    extraMeta?: Record<string, unknown>;
  },
): Promise<boolean> {
  if (!ObjectId.isValid(fileId)) return false;
  const db = await tryGetMongoDb();
  if (!db) return false;
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const oid = new ObjectId(fileId);

  try {
    await bucket.delete(oid);
  } catch {
    // puede no existir
  }

  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openUploadStreamWithId(oid, options.fileName, {
      metadata: {
        mimeType: options.mimeType,
        folder: options.folder,
        ownerId: options.ownerId ?? null,
        ...options.extraMeta,
      },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(buffer);
  });

  return true;
}

export async function readGridFsBuffer(fileId: string): Promise<{
  buffer: Buffer;
  meta: Awaited<ReturnType<typeof getMongoFileMeta>>;
} | null> {
  const opened = await openGridFsDownloadStream(fileId);
  if (!opened) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of opened.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return { buffer: Buffer.concat(chunks), meta: opened.meta };
}

export function gridFileMimeType(
  metadata: Record<string, unknown> | undefined,
  fileName?: string | null,
): string {
  const mime = metadata?.mimeType;
  if (typeof mime === "string" && mime.trim()) {
    const normalized = mime.trim().toLowerCase();
    // HEIC no se pinta en Chrome/Firefox; si el archivo ya es web-safe
    // pero quedó mal etiquetado, inferimos por extensión abajo.
    if (
      normalized !== "application/octet-stream" &&
      normalized !== "image/heic" &&
      normalized !== "image/heif"
    ) {
      return mime.trim();
    }
  }

  const name =
    (typeof fileName === "string" && fileName) ||
    (typeof metadata?.originalName === "string" && metadata.originalName) ||
    (typeof metadata?.fileName === "string" && metadata.fileName) ||
    "";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  if (byExt[ext]) return byExt[ext];

  // Assets de carpetas públicas de imagen: asumir JPEG si no hay pista.
  const folder = typeof metadata?.folder === "string" ? metadata.folder : "";
  if (
    folder === "site" ||
    folder === "brand" ||
    folder === "auth" ||
    folder === "cv" ||
    folder === "products" ||
    folder === "packages"
  ) {
    return "image/jpeg";
  }

  return typeof mime === "string" && mime.trim()
    ? mime.trim()
    : "application/octet-stream";
}

export function mongoStreamToWebResponse(
  nodeStream: Readable,
  mimeType: string,
  options?: {
    cacheControl?: string;
    disposition?: "inline" | "attachment";
    fileName?: string;
  },
): Response {
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Cache-Control": options?.cacheControl ?? "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (options?.disposition && options.fileName) {
    const safe = options.fileName.replace(/[^\w.\-() ]/g, "_");
    headers["Content-Disposition"] = `${options.disposition}; filename="${safe}"`;
  } else if (options?.disposition === "inline") {
    headers["Content-Disposition"] = "inline";
  }
  return new Response(webStream, { headers });
}
