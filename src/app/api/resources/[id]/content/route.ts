import { auth } from "@/lib/auth";
import { detectBufferMimeType } from "@/lib/detect-buffer-mime";
import {
  normalizeStoredUrl,
  openStoredFileUrl,
  readStoredFileUrlToBuffer,
} from "@/lib/stored-file";
import { canAccessResourceContent } from "@/server/services/media-access.service";
import { prisma } from "@/server/db/prisma";

export async function HEAD(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return GET(req, context);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const allowed = await canAccessResourceContent(id);
    if (!allowed) {
      const session = await auth();
      return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
        status: session?.user ? 403 : 401,
      });
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { contentUrl: true, type: true, title: true },
    });
    if (!resource?.contentUrl) {
      return new Response("Sin contenido", { status: 404 });
    }

    const contentUrl = normalizeStoredUrl(resource.contentUrl);
    const buffer = await readStoredFileUrlToBuffer(contentUrl);
    if (!buffer || buffer.length === 0) {
      console.warn(
        "[resources/content] archivo no encontrado o vacío",
        contentUrl,
      );
      return new Response(
        "Archivo no encontrado. Volvé a subir el PDF o archivo desde Admin → Recursos.",
        { status: 404 },
      );
    }

    const file = await openStoredFileUrl(contentUrl);
    const fallbackMime = file?.mimeType ?? "application/octet-stream";
    const mimeType = detectBufferMimeType(buffer, fallbackMime);
    const kind = mimeType.startsWith("image/") ? "image" : mimeType === "application/pdf" ? "pdf" : "unknown";

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Content-Kind": kind,
      "Content-Disposition": "inline",
    };

    return new Response(new Uint8Array(buffer), { headers });
  } catch (err) {
    console.error("[resources/content]", err);
    return new Response("Error al cargar contenido", { status: 500 });
  }
}
