import { BrandGalleryStrip } from "@/components/marketing/brand-gallery-strip";
import { BrandPillarsShowcase } from "@/components/marketing/brand-pillars-showcase";
import { BrandSocialFooter } from "@/components/marketing/brand-social-footer";
import { FlyerHero } from "@/components/marketing/flyer-hero";
import { LandingCtaSection } from "@/components/marketing/landing-cta-section";
import { LandingLobbyShell } from "@/components/marketing/landing-lobby-shell";
import { LandingPackagesSection } from "@/components/marketing/landing-packages-section";
import { getConsultationTypes } from "@/server/actions/booking.queries";
import { getLandingImages } from "@/server/queries/landing.queries";

export const revalidate = 60;

export default async function LandingPage() {
  const [images, consultations] = await Promise.all([
    getLandingImages(),
    getConsultationTypes(),
  ]);

  return (
    <LandingLobbyShell>
      <FlyerHero slides={images.heroSlides} />

      <BrandGalleryStrip items={images.gallery} />

      <BrandPillarsShowcase
        services={images.services}
        plans={images.plans}
      />

      <LandingPackagesSection
        consultations={consultations}
        planImages={images.plans}
      />

      <LandingCtaSection backgroundSrc={images.ctaBackground} />

      <BrandGalleryStrip
        items={images.gallery}
        title="Comunidad · Constancia · Evolución"
        reverse
      />

      <BrandSocialFooter />
    </LandingLobbyShell>
  );
}
