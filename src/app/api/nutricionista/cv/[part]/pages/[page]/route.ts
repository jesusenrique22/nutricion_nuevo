import { isAllowedCvPdfRequest } from "@/lib/cv-pdf-access";
import { renderStoredPdfPageAsPng } from "@/server/services/cv-pdf-render.service";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ part: string; page: string }> },
) {
  if (!isAllowedCvPdfRequest(req)) {
    return new Response("No autorizado", { status: 403 });
  }

  const { part: partRaw, page: pageRaw } = await params;
  const part = Number.parseInt(partRaw, 10);
  const pageNum = Number.parseInt(pageRaw, 10);
  if (!Number.isFinite(part) || part < 0) {
    return new Response("Parte inválida", { status: 400 });
  }
  if (!Number.isInteger(pageNum) || pageNum < 1) {
    return new Response("Página inválida", { status: 400 });
  }

  const data = await getNutricionistaPage();
  const url = data.cvPdfUrls[part]?.trim();
  if (!url) {
    return new Response("No encontrado", { status: 404 });
  }

  try {
    const png = await renderStoredPdfPageAsPng(url, pageNum, 1400);
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
    console.error("[nutricionista/cv/pages/render]", err);
    return new Response("Error al renderizar página", { status: 500 });
  }
}
