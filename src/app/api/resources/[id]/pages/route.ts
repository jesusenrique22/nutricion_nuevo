import { auth } from "@/lib/auth";
import { canAccessResourceContent } from "@/server/services/media-access.service";
import { getStoredPdfPageCount } from "@/server/services/cv-pdf-render.service";
import { prisma } from "@/server/db/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const allowed = await canAccessResourceContent(id);
    if (!allowed) {
      const session = await auth();
      return Response.json(
        { error: session?.user ? "No autorizado" : "Inicia sesión" },
        { status: session?.user ? 403 : 401 },
      );
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { contentUrl: true },
    });
    if (!resource?.contentUrl) {
      return Response.json({ error: "Sin contenido" }, { status: 404 });
    }

    const totalPages = await getStoredPdfPageCount(resource.contentUrl);
    if (totalPages === 0) {
      return Response.json({ error: "PDF no encontrado" }, { status: 404 });
    }

    return Response.json({ totalPages });
  } catch (err) {
    console.error("[resources/pages/meta]", err);
    return Response.json({ error: "Error al cargar PDF" }, { status: 500 });
  }
}
