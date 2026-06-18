import { auth } from "@/lib/auth";
import {
  openStoredFileUrl,
  storedFileToResponse,
} from "@/lib/stored-file";
import { canAccessStoredMediaUrl } from "@/server/services/media-access.service";

/** Sirve archivos almacenados (Mongo o /uploads) con control de acceso. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const src = searchParams.get("src");
    if (!src || !src.startsWith("/")) {
      return new Response("URL inválida", { status: 400 });
    }

    const allowed = await canAccessStoredMediaUrl(src);
    if (!allowed) {
      const session = await auth();
      return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
        status: session?.user ? 403 : 401,
      });
    }

    const file = await openStoredFileUrl(src);
    if (!file) {
      return new Response("Archivo no encontrado", { status: 404 });
    }

    return storedFileToResponse(file, { inline: true });
  } catch (err) {
    console.error("[secure-file]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}
