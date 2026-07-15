import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { guessContentKindFromUrl } from "@/lib/content-kind";
import {
  gridFileMimeType,
  getMongoFileMeta,
  openMongoFileStream,
} from "@/server/services/mongo-storage";
import { tryGetMongoDb } from "@/server/db/mongo";
import {
  gridFileMimeType as gridMime,
  openGridFsDownloadStream,
} from "@/server/services/mongo-gridfs";

export { guessContentKindFromUrl };

export type StoredFileOpenResult = {
  stream: Readable;
  mimeType: string;
  fileName?: string;
};

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Normaliza URLs absolutas del deploy a path relativo (`/api/media/...`). */
export function normalizeStoredUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // keep as-is
  }
  return trimmed;
}

export function parseMediaIdFromUrl(url: string): string | null {
  const normalized = normalizeStoredUrl(url).split("?")[0] ?? "";
  const match = normalized.match(/^\/api\/media\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

export function isUploadsPath(url: string): boolean {
  return normalizeStoredUrl(url).startsWith("/uploads/");
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export async function guessContentKindFromStoredUrl(
  url: string | null | undefined,
  resourceType?: string,
): Promise<"pdf" | "image" | "video" | "unknown"> {
  const fromUrl = guessContentKindFromUrl(url, resourceType);
  if (fromUrl !== "unknown") return fromUrl;

  const mediaId = parseMediaIdFromUrl(url ?? "");
  if (!mediaId) return "unknown";

  const meta = await getMongoFileMeta(mediaId);
  if (!meta) return "unknown";

  const mime = gridFileMimeType(
    meta.metadata as Record<string, unknown> | undefined,
  );
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "unknown";
}

async function openGridFsWithRetry(fileId: string) {
  const fast = await openMongoFileStream(fileId);
  if (fast) return fast;

  // Second pass with the slow/retry Mongo path (Atlas cold start).
  const db = await tryGetMongoDb();
  if (!db) return null;
  return openGridFsDownloadStream(fileId);
}

async function resolveUploadsFallbackFromMediaAsset(
  fileId: string,
): Promise<StoredFileOpenResult | null> {
  try {
    const { prisma } = await import("@/server/db/prisma");
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        OR: [
          { fileId },
          { url: `/api/media/${fileId}` },
          { url: { contains: fileId } },
        ],
      },
      select: { url: true },
    });
    if (!asset?.url) return null;
    const pathUrl = normalizeStoredUrl(asset.url);
    if (!pathUrl.startsWith("/uploads/")) return null;
    return openLocalUploadsPath(pathUrl);
  } catch {
    return null;
  }
}

async function openLocalUploadsPath(
  url: string,
): Promise<StoredFileOpenResult | null> {
  const rel = normalizeStoredUrl(url).replace(/^\//, "").split("?")[0] ?? "";
  const abs = path.join(process.cwd(), "public", rel);
  try {
    await stat(abs);
  } catch {
    return null;
  }
  return {
    stream: createReadStream(abs),
    mimeType: mimeFromPath(abs),
    fileName: path.basename(abs),
  };
}

export async function openStoredFileUrl(
  url: string,
): Promise<StoredFileOpenResult | null> {
  const normalized = normalizeStoredUrl(url);
  const mediaId = parseMediaIdFromUrl(normalized);
  if (mediaId) {
    const result = await openGridFsWithRetry(mediaId);
    if (result) {
      return {
        stream: result.stream,
        mimeType: gridMime(
          result.meta.metadata as Record<string, unknown> | undefined,
        ),
        fileName: result.meta.filename,
      };
    }
    // Legacy: media id apunta a un archivo solo local.
    return resolveUploadsFallbackFromMediaAsset(mediaId);
  }

  if (isUploadsPath(normalized)) {
    return openLocalUploadsPath(normalized);
  }

  return null;
}

export async function readStoredFileUrlToBuffer(
  url: string,
): Promise<Buffer | null> {
  const file = await openStoredFileUrl(url);
  if (!file) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of file.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function storedFileToResponse(
  file: StoredFileOpenResult,
  options?: { inline?: boolean },
): Response {
  const inline = options?.inline !== false;
  const webStream = Readable.toWeb(file.stream) as ReadableStream;
  const headers: Record<string, string> = {
    "Content-Type": file.mimeType,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (file.fileName) {
    const safeName = file.fileName.replace(/[^\w.\-() ]+/g, "_");
    headers["Content-Disposition"] = `${inline ? "inline" : "attachment"}; filename="${safeName}"`;
  }
  return new Response(webStream, { headers });
}
