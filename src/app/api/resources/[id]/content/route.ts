import { auth } from "@/lib/auth";
import { openStoredFileUrl, storedFileToResponse } from "@/lib/stored-file";
import { canAccessResourceContent } from "@/server/services/media-access.service";
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

    const file = await openStoredFileUrl(resource.contentUrl);
    if (!file) {
      return new Response("Archivo no encontrado", { status: 404 });
    }

    return storedFileToResponse(file, { inline: true });
  } catch (err) {
    console.error("[resources/content]", err);
    return new Response("Error al cargar contenido", { status: 500 });
  }
}
