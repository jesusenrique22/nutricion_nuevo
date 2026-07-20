import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { NutricionistaAboutSection } from "@/components/marketing/nutricionista-about-section";
import { BRAND_PROFILE } from "@/lib/brand-assets";
import { preloadCriticalImages } from "@/lib/preload-critical-images";
import { getNutricionistaPage } from "@/server/queries/nutricionista-cv.queries";

export const dynamic = "force-dynamic";

export default async function NutricionistaPage() {
  const page = await getNutricionistaPage();
  const photoSrc = page.cv.photoUrl?.trim() || BRAND_PROFILE.professional;
  preloadCriticalImages([photoSrc]);

  return (
    <div className="bg-accent-soft/25 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <ContentLobbyShell
          title={page.pageTitle}
          description={page.pageDescription}
        >
          <NutricionistaAboutSection about={page.about} cv={page.cv} />
        </ContentLobbyShell>
      </div>
    </div>
  );
}
