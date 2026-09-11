import { auth } from "@/lib/auth";
import { openStoredFileUrl, storedFileToResponse } from "@/lib/stored-file";
import { canAccessResourceVideo } from "@/server/services/media-access.service";
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
    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { videoUrl: true },
    });
    if (!resource?.videoUrl) {
      return new Response("Sin video", { status: 404 });
    }

    const allowed = await canAccessResourceVideo(id, resource.videoUrl);
    if (!allowed) {
      const session = await auth();
      return new Response(session?.user ? "No autorizado" : "Inicia sesión", {
        status: session?.user ? 403 : 401,
      });
    }

    const file = await openStoredFileUrl(resource.videoUrl);
    if (!file) {
      return new Response("Video no encontrado", { status: 404 });
    }

    return storedFileToResponse(file, { inline: true });
  } catch (err) {
    console.error("[resources/video]", err);
    return new Response("Error al cargar video", { status: 500 });
  }
}
