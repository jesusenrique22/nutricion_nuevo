import Link from "next/link";
import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import {
  NutricionistaCvPdfEmptyState,
  NutricionistaCvPdfViewerList,
} from "@/components/marketing/nutricionista-cv-pdf-viewer";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export const dynamic = "force-dynamic";

export default async function NutricionistaEspecialidadPage() {
  const page = await getNutricionistaPage();
  const cvPdfUrls = page.cvPdfUrls.filter(Boolean);

  return (
    <div className="bg-accent-soft/25 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/nutricionista"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-foreground"
        >
          <span aria-hidden>←</span> Volver a Sobre mí
        </Link>

        <div className="mt-6">
          <ContentLobbyShell
            title={page.about.specialtyPageTitle}
            description={page.about.specialtyPageDescription}
          >
            {cvPdfUrls.length > 0 ? (
              <NutricionistaCvPdfViewerList urls={cvPdfUrls} />
            ) : (
              <NutricionistaCvPdfEmptyState />
            )}
          </ContentLobbyShell>
        </div>
      </div>
    </div>
  );
}
