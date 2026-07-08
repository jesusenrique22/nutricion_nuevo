import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  gridFileMimeType,
  getMongoFileMeta,
  openMongoFileStream,
} from "@/server/services/mongo-storage";

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

export function parseMediaIdFromUrl(url: string): string | null {
  const match = url.match(/^\/api\/media\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

export function isUploadsPath(url: string): boolean {
  return url.startsWith("/uploads/");
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function guessContentKindFromUrl(
  url: string | null | undefined,
  resourceType?: string,
): "pdf" | "image" | "video" | "unknown" {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (/\.(jpe?g|png|webp|gif)(\?|$)/.test(lower)) return "image";
  if (/\.(mp4|webm)(\?|$)/.test(lower)) return "video";
  if (/\.pdf(\?|$)/.test(lower)) return "pdf";
  if (resourceType === "EBOOK" || resourceType === "PACKAGE") return "pdf";
  return "unknown";
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

export async function openStoredFileUrl(
  url: string,
): Promise<StoredFileOpenResult | null> {
  const mediaId = parseMediaIdFromUrl(url);
  if (mediaId) {
    const result = await openMongoFileStream(mediaId);
    if (!result) return null;
    return {
      stream: result.stream,
      mimeType: gridFileMimeType(
        result.meta.metadata as Record<string, unknown> | undefined,
      ),
      fileName: result.meta.filename,
    };
  }

  if (isUploadsPath(url)) {
    const rel = url.replace(/^\//, "");
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
    const safeName = file.fileName.replace(/[^\w.\-() ]/g, "_");
    headers["Content-Disposition"] = `${inline ? "inline" : "attachment"}; filename="${safeName}"`;
  }
  return new Response(webStream, { headers });
}
