import { isPublicMediaFolder } from "@/lib/media-access-policy";
import { findLocalUploadByFileId, openLocalMediaStream } from "@/server/services/media-local-resolve";
import {
  gridFileMimeType,
  mongoStreamToWebResponse,
  openGridFsDownloadStream,
} from "@/server/services/mongo-gridfs";

export async function handleMediaGet(
  req: Request,
  { id }: { id: string },
): Promise<Response> {
  const located = await findLocalUploadByFileId(id);
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
      );
      return mongoStreamToWebResponse(local.stream, mimeType, {
        cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
        disposition: "inline",
      });
    }
  }

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
        return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
          status: session?.user ? 403 : 401,
        });
      }
    }
  }

  const mimeType = gridFileMimeType(metadata);
  return mongoStreamToWebResponse(grid.stream, mimeType, {
    cacheControl: isPublic
      ? "public, max-age=86400, stale-while-revalidate=604800"
      : "private, no-store",
    disposition: "inline",
  });
}
