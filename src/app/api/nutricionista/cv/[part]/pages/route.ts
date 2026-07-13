import { isAllowedCvPdfRequest } from "@/lib/cv-pdf-access";
import { getStoredPdfPageCount } from "@/server/services/cv-pdf-render.service";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ part: string }> },
) {
  if (!isAllowedCvPdfRequest(req)) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const { part: partRaw } = await params;
  const part = Number.parseInt(partRaw, 10);
  if (!Number.isFinite(part) || part < 0) {
    return Response.json({ error: "Parte inválida" }, { status: 400 });
  }

  const page = await getNutricionistaPage();
  const url = page.cvPdfUrls[part]?.trim();
  if (!url) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const totalPages = await getStoredPdfPageCount(url);
    if (totalPages === 0) {
      return Response.json({ error: "PDF no encontrado" }, { status: 404 });
    }
    return Response.json({ totalPages });
  } catch (err) {
    console.error("[nutricionista/cv/pages/meta]", err);
    return Response.json({ error: "Error al cargar PDF" }, { status: 500 });
  }
}
