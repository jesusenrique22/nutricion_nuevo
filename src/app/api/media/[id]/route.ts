import { auth } from "@/lib/auth";
import {
  gridFileMimeType,
  mongoStreamToWebResponse,
  openMongoFileStream,
} from "@/server/services/mongo-storage";
import { canAccessStoredMediaUrl } from "@/server/services/media-access.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await openMongoFileStream(id);
    if (!result) {
      return new Response("No encontrado", { status: 404 });
    }

    const url = `/api/media/${id}`;
    const allowed = await canAccessStoredMediaUrl(url);
    if (!allowed) {
      const session = await auth();
      return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
        status: session?.user ? 403 : 401,
      });
    }

    const mimeType = gridFileMimeType(
      result.meta.metadata as Record<string, unknown> | undefined,
    );

    return mongoStreamToWebResponse(result.stream, mimeType, {
      cacheControl: "private, no-store",
      disposition: "inline",
    });
  } catch (err) {
    console.error("[media/get]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}
