import { Suspense } from "react";
import { BrandPillarsShowcase } from "@/components/marketing/brand-pillars-showcase";
import { BrandSocialFooter } from "@/components/marketing/brand-social-footer";
import { FlyerHero } from "@/components/marketing/flyer-hero";
import { LandingBlocksRegion } from "@/components/marketing/landing-blocks-region";
import { LandingCtaSection } from "@/components/marketing/landing-cta-section";
import { LandingLobbyShell } from "@/components/marketing/landing-lobby-shell";
import { LandingPackagesSection } from "@/components/marketing/landing-packages-section";
import { ReviewsShowcase } from "@/components/marketing/reviews-showcase";
import { preloadCriticalImages } from "@/lib/preload-critical-images";
import { getConsultationTypes } from "@/server/actions/booking.queries";
import {
  getLandingBlocks,
  getLandingImages,
} from "@/server/queries/landing.queries";
import { getContactame } from "@/server/queries/contactame.queries";
import { getPublishedReviews } from "@/server/queries/reviews.queries";
import type { LandingBlockPlacement } from "@/types/landing-blocks";

export const revalidate = 60;

/** Hero solo: no espera reviews/paquetes → HTML + imagen LCP más temprano. */
async function LandingHero() {
  const images = await getLandingImages();
  preloadCriticalImages([
    images.heroSlides[0]?.src,
    images.heroSlides[1]?.src,
  ]);
  return <FlyerHero slides={images.heroSlides} />;
}

function HeroFallback() {
  return (
    <section
      id="inicio"
      className="lobby-panel relative min-h-[100svh] scroll-mt-20 overflow-hidden bg-primary"
      aria-hidden
    />
  );
}

async function LandingRest() {
  const [images, consultations, blocksData, reviews, contactame] =
    await Promise.all([
      getLandingImages(),
      getConsultationTypes(),
      getLandingBlocks(),
      getPublishedReviews(),
      getContactame(),
    ]);

  preloadCriticalImages([
    images.services.nutrition,
    images.services.training,
    images.services.anthropometry,
  ]);

  const enabledBlocks = blocksData.blocks.filter((block) => block.enabled);
  const blocksAt = (placement: LandingBlockPlacement) =>
    enabledBlocks.filter((block) => block.placement === placement);

  return (
    <>
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

      <BrandSocialFooter contactame={contactame} />
    </>
  );
}

export default function LandingPage() {
  return (
    <LandingLobbyShell>
      <Suspense fallback={<HeroFallback />}>
        <LandingHero />
      </Suspense>
      <Suspense fallback={null}>
        <LandingRest />
      </Suspense>
    </LandingLobbyShell>
  );
}
