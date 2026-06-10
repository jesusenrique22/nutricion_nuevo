import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { NutricionistaCvDocument } from "@/components/marketing/nutricionista-cv-document";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export const dynamic = "force-dynamic";

export default async function NutricionistaPage() {
  const page = await getNutricionistaPage();

  return (
    <div className="bg-accent-soft/25 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <ContentLobbyShell
          title={page.pageTitle}
          description={page.pageDescription}
        >
          <NutricionistaCvDocument cv={page.cv} />
        </ContentLobbyShell>
      </div>
    </div>
  );
}
