"use client";

/**
 * Muestra el CV vía API (sin pdfjs/canvas en el serverless de la página).
 * La API valida referer / same-origin en cv-pdf-access.ts.
 */
export function NutricionistaCvPdfEmbed({
  partIndex,
  label,
}: {
  partIndex: number;
  label: string;
}) {
  const src = `/api/nutricionista/cv/${partIndex}`;

  return (
    <div className="overflow-hidden rounded-sm bg-white shadow-[0_24px_60px_-24px_rgba(116,30,49,0.2)] ring-1 ring-primary/10">
      <iframe
        src={src}
        title={label}
        className="block h-[min(80vh,900px)] w-full border-0 bg-white"
      />
    </div>
  );
}
