import { Suspense } from "react";
import { BrandPillarsShowcase } from "@/components/marketing/brand-pillars-showcase";
import { BrandSocialFooter } from "@/components/marketing/brand-social-footer";
import { FlyerHero } from "@/components/marketing/flyer-hero";
import { LandingBlocksRegion } from "@/components/marketing/landing-blocks-region";
import { LandingCtaSection } from "@/components/marketing/landing-cta-section";
import { LandingLobbyShell } from "@/components/marketing/landing-lobby-shell";
import { LandingPackagesSection } from "@/components/marketing/landing-packages-section";
import { ReviewsShowcase } from "@/components/marketing/reviews-showcase";
import { DEFAULT_LANDING_BLOCKS } from "@/lib/landing-blocks-defaults";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { preloadCriticalImages } from "@/lib/preload-critical-images";
import {
  getConsultationTypes,
  type ConsultationTypeDTO,
} from "@/server/actions/booking.queries";
import {
  getLandingBlocks,
  getLandingImages,
} from "@/server/queries/landing.queries";
import { getContactame } from "@/server/queries/contactame.queries";
import { getPublishedReviews } from "@/server/queries/reviews.queries";
import {
  DEFAULT_CONTACTAME,
  type ContactameData,
} from "@/types/contactame";
import type {
  LandingBlockPlacement,
  LandingBlocksData,
} from "@/types/landing-blocks";
import type { LandingImagesData } from "@/types/landing-images";
import type { PublicReview } from "@/types/review";

export const revalidate = 60;

function settledOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === "fulfilled") return result.value;
  console.error("[landing] fetch falló; usando fallback", result.reason);
  return fallback;
}

/** Hero solo: no espera reviews/paquetes → HTML + imagen LCP más temprano. */
async function LandingHero() {
  const images = await getLandingImages();
  preloadCriticalImages([images.heroSlides[0]?.src]);
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
  const results = await Promise.allSettled([
    getLandingImages(),
    getConsultationTypes(),
    getLandingBlocks(),
    getPublishedReviews(),
    getContactame(),
  ]);

  const images = settledOr<LandingImagesData>(
    results[0],
    DEFAULT_LANDING_IMAGES,
  );
  const consultations = settledOr<ConsultationTypeDTO[]>(results[1], []);
  const blocksData = settledOr<LandingBlocksData>(
    results[2],
    DEFAULT_LANDING_BLOCKS,
  );
  const reviews = settledOr<PublicReview[]>(results[3], []);
  const contactame = settledOr<ContactameData>(
    results[4],
    DEFAULT_CONTACTAME,
  );

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
