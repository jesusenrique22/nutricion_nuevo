import { handleMediaGet } from "@/server/services/media-id-get";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await handleMediaGet(req, { id });
  } catch (err) {
    console.error("[media/get]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}
