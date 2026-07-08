import { GridFSBucket, ObjectId } from "mongodb";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { tryGetMongoDb } from "@/server/db/mongo";
import { prisma } from "@/server/db/prisma";

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

export async function getMongoFileMeta(fileId: string) {
  if (!ObjectId.isValid(fileId)) return null;
  const db = await tryGetMongoDb();
  if (!db) return null;
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const files = await bucket
    .find({ _id: new ObjectId(fileId) })
    .limit(1)
    .toArray();
  return files[0] ?? null;
}

export async function openMongoFileStream(fileId: string) {
  if (!ObjectId.isValid(fileId)) return null;

  const local = await openLocalMediaStream(fileId);
  if (local) return local;

  const db = await tryGetMongoDb();
  if (!db) return null;
  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const meta = await getMongoFileMeta(fileId);
  if (!meta) return null;
  const stream = bucket.openDownloadStream(new ObjectId(fileId));
  return { stream, meta };
}

type MediaStreamResult = {
  stream: Readable;
  meta: {
    filename?: string;
    metadata?: Record<string, unknown>;
  };
};

async function openLocalMediaStream(fileId: string): Promise<MediaStreamResult | null> {
  const asset = await prisma.mediaAsset.findFirst({
    where: {
      OR: [{ fileId }, { url: `/api/media/${fileId}` }],
      provider: "local",
    },
    select: { url: true, mimeType: true, fileName: true },
  });

  if (!asset?.url.startsWith("/uploads/")) return null;

  const abs = path.join(process.cwd(), "public", asset.url.replace(/^\//, ""));
  try {
    await stat(abs);
  } catch {
    return null;
  }

  return {
    stream: createReadStream(abs),
    meta: {
      filename: asset.fileName ?? path.basename(abs),
      metadata: { mimeType: asset.mimeType },
    },
  };
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

export function gridFileMimeType(
  metadata: Record<string, unknown> | undefined,
): string {
  const mime = metadata?.mimeType;
  return typeof mime === "string" ? mime : "application/octet-stream";
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
