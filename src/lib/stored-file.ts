import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { guessContentKindFromUrl } from "@/lib/content-kind";
import {
  isUploadsPath,
  normalizeStoredUrl,
  parseMediaIdFromUrl,
} from "@/lib/stored-file-url";

export { isUploadsPath, normalizeStoredUrl, parseMediaIdFromUrl };
import {
  gridFileMimeType,
  getMongoFileMeta,
  openMongoFileStream,
} from "@/server/services/mongo-storage";
import { tryGetMongoDbWithin } from "@/server/db/mongo";
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

function isRemoteHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(normalizeStoredUrl(url));
}

async function openRemoteHttpsUrl(
  url: string,
): Promise<StoredFileOpenResult | null> {
  if (!isRemoteHttpsUrl(url)) return null;
  try {
    const res = await fetch(normalizeStoredUrl(url), {
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim();
    const fileName = (() => {
      try {
        return path.basename(new URL(url).pathname) || undefined;
      } catch {
        return undefined;
      }
    })();
    return {
      stream: Readable.from(buffer),
      mimeType:
        contentType && contentType !== "application/octet-stream"
          ? contentType
          : mimeFromPath(fileName ?? url),
      fileName,
    };
  } catch {
    return null;
  }
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

  const mimeType = gridFileMimeType(
    meta.metadata as Record<string, unknown> | undefined,
    meta.filename,
  );
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
}

/** Margen para que el visor reciba un error claro en vez de quedarse girando. */
const MONGO_READ_DEADLINE_MS = 15_000;

async function openGridFsWithRetry(fileId: string) {
  const fast = await openMongoFileStream(fileId);
  if (fast) return fast;

  // Segunda pasada por el camino lento de Mongo (Atlas recién despierto),
  // pero acotada: sin techo, una caída de Atlas cuelga la petición entera.
  const db = await tryGetMongoDbWithin(MONGO_READ_DEADLINE_MS);
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
  const raw = url.trim();
  const normalized = normalizeStoredUrl(raw);
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

  const isAbsolute = /^https?:\/\/\S+$/i.test(raw);

  if (!isAbsolute && isUploadsPath(normalized)) {
    return openLocalUploadsPath(normalized);
  }

  // Contra la URL cruda: normalizeStoredUrl deja solo el path, con lo que un
  // PDF alojado en otro dominio dejaba de parecer remoto y no se abría nunca.
  if (isRemoteHttpsUrl(raw)) {
    return openRemoteHttpsUrl(raw);
  }

  if (isUploadsPath(normalized)) {
    return openLocalUploadsPath(normalized);
  }

  return null;
}

/**
 * Comprueba que el archivo quedó guardado y con qué tamaño, sin descargarlo.
 *
 * Verificar una subida releyendo el archivo entero desde GridFS puede tardar
 * más que el propio límite de la función serverless (Atlas frío + PDF grande):
 * la subida terminaba bien pero el panel la daba por fallida. Con los metadatos
 * alcanza para saber que el binario está completo.
 */
export async function statStoredFileUrl(
  url: string,
): Promise<{ size: number; mimeType: string } | null> {
  const normalized = normalizeStoredUrl(url);
  const mediaId = parseMediaIdFromUrl(normalized);

  if (mediaId) {
    const meta = await getMongoFileMeta(mediaId);
    if (meta) {
      return {
        size: meta.length ?? 0,
        mimeType: gridFileMimeType(
          meta.metadata as Record<string, unknown> | undefined,
          meta.filename,
        ),
      };
    }
    // Legacy: el id apunta a un archivo solo local.
    const fallback = await resolveUploadsFallbackFromMediaAsset(mediaId);
    if (!fallback) return null;
    fallback.stream.destroy?.();
    return statLocalUploadsPath(fallback.fileName ?? "", mediaId);
  }

  if (isUploadsPath(normalized)) {
    const rel = normalized.replace(/^\//, "").split("?")[0] ?? "";
    const abs = path.join(process.cwd(), "public", rel);
    try {
      const info = await stat(abs);
      return { size: info.size, mimeType: mimeFromPath(abs) };
    } catch {
      return null;
    }
  }

  return null;
}

async function statLocalUploadsPath(
  fileName: string,
  fileId: string,
): Promise<{ size: number; mimeType: string } | null> {
  const { prisma } = await import("@/server/db/prisma");
  const asset = await prisma.mediaAsset.findFirst({
    where: { OR: [{ fileId }, { url: { contains: fileId } }] },
    select: { url: true },
  });
  if (!asset?.url.startsWith("/uploads/")) return null;

  const abs = path.join(
    process.cwd(),
    "public",
    asset.url.replace(/^\//, ""),
  );
  try {
    const info = await stat(abs);
    return { size: info.size, mimeType: mimeFromPath(fileName || abs) };
  } catch {
    return null;
  }
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
