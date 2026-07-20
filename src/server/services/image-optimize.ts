import sharp from "sharp";
import { isPublicMediaFolder } from "@/lib/media-access-policy";

const HERO_MAX_EDGE = 1920;
const PUBLIC_MAX_EDGE = 1600;
const PRIVATE_MAX_EDGE = 2048;

/**
 * Comprime imágenes de marketing antes de guardarlas.
 * Objetivo: hero/landing livianos (~100–300 KB) en vez de PNG de 2–3 MB.
 */
export async function optimizeImageBufferForFolder(
  buffer: Buffer,
  folder: string,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string; ext: string } | null> {
  if (!mimeType.startsWith("image/")) return null;
  if (mimeType === "image/gif" || mimeType === "image/svg+xml") return null;

  const maxEdge = isPublicMediaFolder(folder)
    ? folder === "site" || folder === "login" || folder === "auth"
      ? HERO_MAX_EDGE
      : PUBLIC_MAX_EDGE
    : PRIVATE_MAX_EDGE;

  const quality = isPublicMediaFolder(folder) ? 78 : 85;

  try {
    const image = sharp(buffer, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    const width = meta.width ?? maxEdge;
    const height = meta.height ?? maxEdge;
    const needsResize = Math.max(width, height) > maxEdge;

    let pipeline = image;
    if (needsResize) {
      pipeline = pipeline.resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const out = await pipeline
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer();

    // Si el original ya era más chico y web-safe, no empeorar.
    if (
      out.length >= buffer.length &&
      (mimeType === "image/jpeg" || mimeType === "image/webp") &&
      !needsResize
    ) {
      return null;
    }

    return { buffer: out, mimeType: "image/jpeg", ext: ".jpg" };
  } catch {
    return null;
  }
}
