import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const PUBLIC_UPLOAD_FOLDERS = [
  "site",
  "brand",
  "cv",
  "products",
  "packages",
] as const;

const MIME_FROM_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

/** Solo disco público — sin Prisma (mantiene el bundle de /api/media liviano). */
export async function findLocalUploadByFileId(fileId: string): Promise<{
  url: string;
  folder: string;
} | null> {
  for (const folder of PUBLIC_UPLOAD_FOLDERS) {
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    const match = files.find((name) => name.startsWith(fileId));
    if (match) {
      return { url: `/uploads/${folder}/${match}`, folder };
    }
  }
  return null;
}

export async function openLocalMediaStream(fileId: string) {
  const located = await findLocalUploadByFileId(fileId);
  if (!located) return null;

  const abs = path.join(process.cwd(), "public", located.url.replace(/^\//, ""));
  try {
    await stat(abs);
  } catch {
    return null;
  }

  const ext = path.extname(abs).toLowerCase();
  return {
    stream: createReadStream(abs),
    meta: {
      filename: path.basename(abs),
      metadata: {
        mimeType: MIME_FROM_EXT[ext] ?? "application/octet-stream",
        folder: located.folder,
      },
    },
  };
}
