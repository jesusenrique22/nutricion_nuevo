import { openMongoFileStream, mongoStreamToWebResponse } from "@/server/services/mongo-storage";

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

    const mimeType =
      (result.meta.metadata?.mimeType as string | undefined) ??
      result.meta.contentType ??
      "application/octet-stream";

    return mongoStreamToWebResponse(result.stream, mimeType);
  } catch (err) {
    console.error("[media/get]", err);
    return new Response("Error al cargar archivo", { status: 500 });
  }
}
