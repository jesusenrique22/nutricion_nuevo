"use client";

import { Reveal } from "@/components/motion/reveal";
import { BrandGalleryStrip } from "@/components/marketing/brand-gallery-strip";
import { LandingBannerBlock } from "@/components/marketing/landing-banner-block";
import type { LandingBlock } from "@/types/landing-blocks";

export function LandingBlockView({ block }: { block: LandingBlock }) {
  if (block.kind === "carousel") {
    return (
      <BrandGalleryStrip
        items={block.items}
        title={block.title}
        reverse={block.reverse}
        size={block.size}
      />
    );
  }
  return <LandingBannerBlock block={block} />;
}

export function LandingBlocksRegion({ blocks }: { blocks: LandingBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, i) => (
        <Reveal key={block.id} delay={i * 0.06} direction="up">
          <LandingBlockView block={block} />
        </Reveal>
      ))}
    </>
  );
}
