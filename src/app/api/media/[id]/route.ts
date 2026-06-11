import {
  gridFileMimeType,
  mongoStreamToWebResponse,
  openMongoFileStream,
} from "@/server/services/mongo-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await openMongoFileStream(id);
    if (!result) {
      return new Response("No encontrado", { status: 404 });
    }

    const mimeType = gridFileMimeType(
      result.meta.metadata as Record<string, unknown> | undefined,
    );

    return mongoStreamToWebResponse(result.stream, mimeType);
  } catch (err) {
    console.error("[media/get]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}
