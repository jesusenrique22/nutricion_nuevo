import { Readable } from "node:stream";
import { isAllowedCvPdfRequest } from "@/lib/cv-pdf-access";
import { openStoredFileUrl } from "@/lib/stored-file";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ part: string }> },
) {
  if (!isAllowedCvPdfRequest(req)) {
    return new Response("No autorizado", { status: 403 });
  }

  const { part: partRaw } = await params;
  const part = Number.parseInt(partRaw, 10);
  if (!Number.isFinite(part) || part < 0) {
    return new Response("Parte inválida", { status: 400 });
  }

  const page = await getNutricionistaPage();
  const url = page.cvPdfUrls[part]?.trim();
  if (!url) {
    return new Response("No encontrado", { status: 404 });
  }

  const file = await openStoredFileUrl(url);
  if (!file) {
    return new Response("No encontrado", { status: 404 });
  }

  const webStream = Readable.toWeb(file.stream) as ReadableStream;
  return new Response(webStream, {
    headers: {
      "Content-Type": file.mimeType || "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
