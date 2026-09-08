import { auth } from "@/lib/auth";
import {
  openStoredFileUrl,
  readStoredFileUrlToBuffer,
} from "@/lib/stored-file";
import { canAccessResourceContent } from "@/server/services/media-access.service";
import { prisma } from "@/server/db/prisma";

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
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

    const buffer = await readStoredFileUrlToBuffer(resource.contentUrl);
    if (!buffer || buffer.length === 0) {
      console.warn(
        "[resources/content] archivo no encontrado o vacío",
        resource.contentUrl,
      );
      return new Response(
        "Archivo no encontrado. Volvé a subir el PDF desde Admin → Recursos.",
        { status: 404 },
      );
    }

    const file = await openStoredFileUrl(resource.contentUrl);
    const mimeType = file?.mimeType ?? "application/octet-stream";
    const expectsPdf =
      resource.type === "EBOOK" ||
      resource.type === "PACKAGE" ||
      mimeType === "application/pdf";

    if (expectsPdf && !isPdfBuffer(buffer)) {
      console.warn(
        "[resources/content] contenido no es PDF válido",
        resource.contentUrl,
        mimeType,
      );
      return new Response(
        "El archivo no es un PDF válido. Editá el recurso y volvé a subir el documento.",
        { status: 422 },
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": expectsPdf ? "application/pdf" : mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    };

    return new Response(new Uint8Array(buffer), { headers });
  } catch (err) {
    console.error("[resources/content]", err);
    return new Response("Error al cargar contenido", { status: 500 });
  }
}
