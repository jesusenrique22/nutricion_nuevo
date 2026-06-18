import { renderStoredPdfAsPngPages } from "@/server/services/cv-pdf-render.service";

function CvPdfPartError() {
  return (
    <div className="overflow-hidden rounded-sm bg-white shadow-[0_24px_60px_-24px_rgba(116,30,49,0.2)] ring-1 ring-primary/10">
      <p className="px-4 py-8 text-center text-sm text-red-600 sm:px-5">
        No se pudo cargar este documento. Recargá la página e intentá de nuevo.
      </p>
    </div>
  );
}

export async function NutricionistaCvPdfPart({
  pdfUrl,
  label,
}: {
  pdfUrl: string;
  label: string;
}) {
  let pages: Buffer[] = [];

  try {
    pages = await renderStoredPdfAsPngPages(pdfUrl);
  } catch (err) {
    console.error("[cv-pdf-render]", pdfUrl, err);
    return <CvPdfPartError />;
  }

  if (pages.length === 0) {
    return <CvPdfPartError />;
  }

  return (
    <div className="overflow-hidden rounded-sm bg-white shadow-[0_24px_60px_-24px_rgba(116,30,49,0.2)] ring-1 ring-primary/10">
      <div className="select-none space-y-2 sm:space-y-3">
        {pages.map((page, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${label}-page-${index + 1}`}
            src={`data:image/png;base64,${page.toString("base64")}`}
            alt={`${label}, página ${index + 1}`}
            className="block w-full"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
