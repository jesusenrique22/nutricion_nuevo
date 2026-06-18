import { NutricionistaCvPdfPart } from "@/components/marketing/nutricionista-cv-pdf-server-part";

export function NutricionistaCvPdfViewerList({ urls }: { urls: string[] }) {
  return (
    <div className="space-y-10">
      {urls.map((url, index) => (
        <NutricionistaCvPdfPart
          key={`${url}-${index}`}
          pdfUrl={url}
          label={
            urls.length > 1 ? `CV — Parte ${index + 1}` : "CV profesional"
          }
        />
      ))}
    </div>
  );
}

export function NutricionistaCvPdfEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-white/60 px-6 py-16 text-center">
      <p className="text-sm font-semibold text-foreground/70">
        El CV estará disponible pronto.
      </p>
      <p className="mt-2 text-sm text-foreground/50">
        La profesional puede subir los archivos PDF desde el panel de
        administración.
      </p>
    </div>
  );
}
