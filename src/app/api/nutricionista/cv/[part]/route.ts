import { isAllowedCvPdfRequest } from "@/lib/cv-pdf-access";
import { openStoredFileUrl, storedFileToResponse } from "@/lib/stored-file";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

/**
 * Sirve el PDF del CV (bytes). El render a páginas se hace en el cliente
 * para no empaquetar pdfjs + canvas nativo en la función de Vercel (~250 MB).
 */
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

  try {
    const file = await openStoredFileUrl(url);
    if (!file) {
      return new Response("PDF no encontrado", { status: 404 });
    }

    return storedFileToResponse(
      { ...file, mimeType: "application/pdf" },
      { inline: true },
    );
  } catch (err) {
    console.error("[nutricionista/cv]", err);
    return new Response("Error al cargar PDF", { status: 500 });
  }
}
