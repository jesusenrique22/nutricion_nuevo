import { isAllowedCvPdfRequest } from "@/lib/cv-pdf-access";
import { renderStoredPdfPageAsPng } from "@/server/services/cv-pdf-render.service";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export const maxDuration = 60;

/**
 * Compatibilidad: clientes con iframe antiguo reciben la 1.ª página como PNG
 * (sin visor PDF del navegador). La vista nueva usa /pages y /pages/[page].
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
    const png = await renderStoredPdfPageAsPng(url, 1, 1400);
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
    console.error("[nutricionista/cv/legacy]", err);
    return new Response("Error al renderizar página", { status: 500 });
  }
}
