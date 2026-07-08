import { auth } from "@/lib/auth";
import { isPublicMediaFolder } from "@/lib/media-access-policy";
import {
  gridFileMimeType,
  findLocalUploadUrl,
  mongoStreamToWebResponse,
  openMongoFileStream,
} from "@/server/services/mongo-storage";
import { canAccessStoredMediaUrl, isPublicStoredMediaUrl } from "@/server/services/media-access.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const located = await findLocalUploadUrl(id);
    if (located && isPublicMediaFolder(located.folder)) {
      return Response.redirect(new URL(located.url, req.url), 307);
    }

    const result = await openMongoFileStream(id);
    if (!result) {
      return new Response("No encontrado", { status: 404 });
    }

    const url = `/api/media/${id}`;
    const folderFromMeta = result.meta.metadata?.folder;
    const allowed =
      (typeof folderFromMeta === "string" &&
        isPublicMediaFolder(folderFromMeta.trim())) ||
      (await canAccessStoredMediaUrl(url));
    if (!allowed) {
      const session = await auth();
      return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
        status: session?.user ? 403 : 401,
      });
    }

    const mimeType = gridFileMimeType(
      result.meta.metadata as Record<string, unknown> | undefined,
    );

    const isPublic = await isPublicStoredMediaUrl(url);

    return mongoStreamToWebResponse(result.stream, mimeType, {
      cacheControl: isPublic
        ? "public, max-age=86400, stale-while-revalidate=604800"
        : "private, no-store",
      disposition: "inline",
    });
  } catch (err) {
    console.error("[media/get]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}
