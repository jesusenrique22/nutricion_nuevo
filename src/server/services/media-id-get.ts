import { isPublicMediaFolder } from "@/lib/media-access-policy";
import { findLocalUploadUrl } from "@/server/services/mongo-storage";
import { openLocalMediaStream } from "@/server/services/media-local-resolve";
import {
  convertHeicBufferToJpeg,
  isHeicBuffer,
} from "@/server/services/heic-normalize";
import {
  gridFileMimeType,
  mongoStreamToWebResponse,
  openGridFsDownloadStream,
  readGridFsBuffer,
  replaceMongoFileInPlace,
} from "@/server/services/mongo-gridfs";

/** Caché corta para que un reemplazo de foto se note al instante. */
const PUBLIC_MEDIA_CACHE =
  "public, max-age=60, must-revalidate, stale-while-revalidate=300";

function jpegFileName(original?: string | null): string {
  const stem = (original ?? "imagen").replace(/\.[^.]+$/, "") || "imagen";
  return `${stem}.jpg`;
}

async function normalizeHeicIfNeeded(
  fileId: string,
  buffer: Buffer,
  meta: NonNullable<Awaited<ReturnType<typeof readGridFsBuffer>>>["meta"],
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!isHeicBuffer(buffer)) {
    const metadata = meta?.metadata as Record<string, unknown> | undefined;
    return {
      buffer,
      mimeType: gridFileMimeType(metadata, meta?.filename),
    };
  }

  const jpeg = await convertHeicBufferToJpeg(buffer);
  const metadata = (meta?.metadata ?? {}) as Record<string, unknown>;
  const folder =
    typeof metadata.folder === "string" ? metadata.folder : "site";
  const ownerId =
    typeof metadata.ownerId === "string" ? metadata.ownerId : null;

  try {
    await replaceMongoFileInPlace(fileId, jpeg, {
      fileName: jpegFileName(meta?.filename),
      mimeType: "image/jpeg",
      folder,
      ownerId,
      extraMeta: { convertedFrom: "heic", convertedAt: new Date().toISOString() },
    });

    // Actualizar índice Prisma si existe (best-effort).
    try {
      const { prisma } = await import("@/server/db/prisma");
      await prisma.mediaAsset.updateMany({
        where: { fileId },
        data: {
          mimeType: "image/jpeg",
          fileName: jpegFileName(meta?.filename),
        },
      });
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.warn("[media] No se pudo persistir JPEG convertido:", err);
  }

  return { buffer: jpeg, mimeType: "image/jpeg" };
}

export async function handleMediaGet(
  req: Request,
  { id }: { id: string },
): Promise<Response> {
  const located = await findLocalUploadUrl(id);
  if (located && isPublicMediaFolder(located.folder)) {
    return Response.redirect(new URL(located.url, req.url), 307);
  }

  const local = await openLocalMediaStream(id);
  if (local) {
    const folder =
      typeof local.meta.metadata?.folder === "string"
        ? local.meta.metadata.folder
        : located?.folder ?? null;
    if (folder && isPublicMediaFolder(folder)) {
      const mimeType = gridFileMimeType(
        local.meta.metadata as Record<string, unknown> | undefined,
        typeof local.meta.filename === "string" ? local.meta.filename : null,
      );
      return mongoStreamToWebResponse(local.stream, mimeType, {
        cacheControl: PUBLIC_MEDIA_CACHE,
        disposition: "inline",
      });
    }
  }

  // Leer buffer completo: permite detectar HEIC y convertir a JPG real.
  const loaded = await readGridFsBuffer(id);
  if (!loaded?.meta) {
    // Fallback stream por si el helper falló a medias
    const grid = await openGridFsDownloadStream(id);
    if (!grid) {
      return new Response("No encontrado", { status: 404 });
    }
    const url = `/api/media/${id}`;
    const metadata = grid.meta.metadata as Record<string, unknown> | undefined;
    const folderFromMeta =
      typeof metadata?.folder === "string" ? metadata.folder.trim() : null;
    let isPublic = Boolean(folderFromMeta && isPublicMediaFolder(folderFromMeta));
    if (!isPublic) {
      const { isPublicMediaGetUrl, canAccessMediaGetUrl } = await import(
        "@/server/services/media-id-access"
      );
      isPublic = await isPublicMediaGetUrl(url, folderFromMeta);
      if (!isPublic) {
        const allowed = await canAccessMediaGetUrl(url, grid.meta);
        if (!allowed) {
          const { auth } = await import("@/lib/auth");
          const session = await auth();
          return new Response(
            session?.user ? "No autorizado" : "Inicia sesión",
            { status: session?.user ? 403 : 401 },
          );
        }
      }
    }
    const mimeType = gridFileMimeType(metadata, grid.meta.filename);
    return mongoStreamToWebResponse(grid.stream, mimeType, {
      cacheControl: isPublic ? PUBLIC_MEDIA_CACHE : "private, no-store",
      disposition: "inline",
    });
  }

  const url = `/api/media/${id}`;
  const metadata = loaded.meta.metadata as Record<string, unknown> | undefined;
  const folderFromMeta =
    typeof metadata?.folder === "string" ? metadata.folder.trim() : null;

  let isPublic = Boolean(folderFromMeta && isPublicMediaFolder(folderFromMeta));

  if (!isPublic) {
    const { isPublicMediaGetUrl, canAccessMediaGetUrl } = await import(
      "@/server/services/media-id-access"
    );
    isPublic = await isPublicMediaGetUrl(url, folderFromMeta);
    if (!isPublic) {
      const allowed = await canAccessMediaGetUrl(url, {
        metadata: loaded.meta.metadata as Record<string, unknown> | undefined,
      });
      if (!allowed) {
        const { auth } = await import("@/lib/auth");
        const session = await auth();
        return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
          status: session?.user ? 403 : 401,
        });
      }
    }
  }

  let body = loaded.buffer;
  let mimeType = gridFileMimeType(metadata, loaded.meta.filename);

  try {
    const normalized = await normalizeHeicIfNeeded(id, loaded.buffer, loaded.meta);
    body = normalized.buffer;
    mimeType = normalized.mimeType;
  } catch (err) {
    console.error("[media] Falló conversión HEIC→JPEG:", err);
    // Si no se pudo convertir, no mentir con image/jpeg: el navegador mostrará error claro
    if (isHeicBuffer(loaded.buffer)) {
      return new Response(
        "Esta imagen está en formato HEIC y no se pudo convertir. Volvé a subirla como JPG desde Personalizar.",
        { status: 415 },
      );
    }
  }

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": isPublic ? PUBLIC_MEDIA_CACHE : "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
