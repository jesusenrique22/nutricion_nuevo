import { auth } from "@/lib/auth";
import {
  openStoredFileUrl,
  readStoredFileUrlToBuffer,
} from "@/lib/stored-file";
import { canAccessResourceContent } from "@/server/services/media-access.service";
import { prisma } from "@/server/db/prisma";

function detectMimeType(buffer: Buffer, fallbackMime?: string): string {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    buffer.subarray(0, 6).toString("ascii").startsWith("GIF8")
  ) {
    return "image/gif";
  }
  if (fallbackMime && fallbackMime !== "application/octet-stream") {
    return fallbackMime;
  }
  return "application/octet-stream";
}

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

    const buffer = await readStoredFileUrlToBuffer(resource.contentUrl);
    if (!buffer || buffer.length === 0) {
      console.warn(
        "[resources/content] archivo no encontrado o vacío",
        resource.contentUrl,
      );
      return new Response(
        "Archivo no encontrado. Volvé a subir el PDF o archivo desde Admin → Recursos.",
        { status: 404 },
      );
    }

    const file = await openStoredFileUrl(resource.contentUrl);
    const fallbackMime = file?.mimeType ?? "application/octet-stream";
    const mimeType = detectMimeType(buffer, fallbackMime);
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
