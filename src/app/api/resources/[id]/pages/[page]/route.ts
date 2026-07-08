import { auth } from "@/lib/auth";
import { canAccessResourceContent } from "@/server/services/media-access.service";
import { renderStoredPdfPageAsPng } from "@/server/services/cv-pdf-render.service";
import { prisma } from "@/server/db/prisma";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; page: string }> },
) {
  try {
    const { id, page: pageRaw } = await params;
    const pageNum = Number(pageRaw);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return new Response("Página inválida", { status: 400 });
    }

    const allowed = await canAccessResourceContent(id);
    if (!allowed) {
      const session = await auth();
      return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
        status: session?.user ? 403 : 401,
      });
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { contentUrl: true, title: true },
    });
    if (!resource?.contentUrl) {
      return new Response("Sin contenido", { status: 404 });
    }

    const png = await renderStoredPdfPageAsPng(resource.contentUrl, pageNum);
    if (!png) {
      return new Response("Página no encontrada", { status: 404 });
    }

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[resources/pages/render]", err);
    return new Response("Error al renderizar página", { status: 500 });
  }
}
