import { auth } from "@/lib/auth";
import { detectBufferMimeType } from "@/lib/detect-buffer-mime";
import {
  normalizeStoredUrl,
  readStoredFileUrlToBuffer,
} from "@/lib/stored-file";
import { canAccessStoredMediaUrl } from "@/server/services/media-access.service";

/** Hobby: max 60s por función; subidas grandes usan fragmentos de 3 MB. */
export const maxDuration = 60;

function isAllowedStoredSrc(src: string): boolean {
  const normalized = normalizeStoredUrl(src);
  return (
    normalized.startsWith("/uploads/") ||
    normalized.startsWith("/api/media/")
  );
}

/** Sirve archivos almacenados (Mongo o /uploads) con control de acceso. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const src = searchParams.get("src");
    if (!src || !src.startsWith("/") || !isAllowedStoredSrc(src)) {
      return new Response("URL inválida", { status: 400 });
    }

    const normalized = normalizeStoredUrl(src);
    const allowed = await canAccessStoredMediaUrl(normalized);
    if (!allowed) {
      const session = await auth();
      return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
        status: session?.user ? 403 : 401,
      });
    }

    const buffer = await readStoredFileUrlToBuffer(normalized);
    if (!buffer || buffer.length === 0) {
      return new Response("Archivo no encontrado o vacío", { status: 404 });
    }

    const mimeType = detectBufferMimeType(buffer);

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    };

    return new Response(new Uint8Array(buffer), { headers });
  } catch (err) {
    console.error("[secure-file]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}
