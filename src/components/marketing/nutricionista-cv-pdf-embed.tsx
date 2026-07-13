"use client";

import { ClientPdfDocumentViewer } from "@/components/pdf/client-pdf-document-viewer";

/**
 * CV: descarga el PDF vía API ligera y lo pinta con pdf.js en el navegador.
 */
export function NutricionistaCvPdfEmbed({
  partIndex,
}: {
  partIndex: number;
  label: string;
}) {
  return (
    <ClientPdfDocumentViewer
      pdfUrl={`/api/nutricionista/cv/${partIndex}`}
      maxWidth={1400}
    />
  );
}
