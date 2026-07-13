import { BrandPillarsShowcase } from "@/components/marketing/brand-pillars-showcase";
import { BrandSocialFooter } from "@/components/marketing/brand-social-footer";
import { FlyerHero } from "@/components/marketing/flyer-hero";
import { LandingBlocksRegion } from "@/components/marketing/landing-blocks-region";
import { LandingCtaSection } from "@/components/marketing/landing-cta-section";
import { LandingLobbyShell } from "@/components/marketing/landing-lobby-shell";
import { LandingPackagesSection } from "@/components/marketing/landing-packages-section";
import { ReviewsShowcase } from "@/components/marketing/reviews-showcase";
import { getConsultationTypes } from "@/server/actions/booking.queries";
import {
  getLandingBlocks,
  getLandingImages,
} from "@/server/queries/landing.queries";
import { getPublishedReviews } from "@/server/queries/reviews.queries";
import type { LandingBlockPlacement } from "@/types/landing-blocks";

export const revalidate = 60;

export default async function LandingPage() {
  const [images, consultations, blocksData, reviews] = await Promise.all([
    getLandingImages(),
    getConsultationTypes(),
    getLandingBlocks(),
    getPublishedReviews(),
  ]);

  const enabledBlocks = blocksData.blocks.filter((block) => block.enabled);
  const blocksAt = (placement: LandingBlockPlacement) =>
    enabledBlocks.filter((block) => block.placement === placement);

  return (
    <LandingLobbyShell>
      <FlyerHero slides={images.heroSlides} />

      <LandingBlocksRegion blocks={blocksAt("after_hero")} />

      <BrandPillarsShowcase
        services={images.services}
        plans={images.plans}
      />

      <LandingBlocksRegion blocks={blocksAt("after_services")} />

      <LandingPackagesSection
        consultations={consultations}
        planImages={images.plans}
      />

      <LandingBlocksRegion blocks={blocksAt("after_packages")} />

      <ReviewsShowcase reviews={reviews} />

      <LandingCtaSection backgroundSrc={images.ctaBackground} />

      <LandingBlocksRegion blocks={blocksAt("before_footer")} />

      <BrandSocialFooter />
    </LandingLobbyShell>
  );
}
