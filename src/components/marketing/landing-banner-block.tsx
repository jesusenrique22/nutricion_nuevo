"use client";

import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type { BannerBlock } from "@/types/landing-blocks";

function BannerCta({ block }: { block: BannerBlock }) {
  if (!block.ctaLabel.trim() || !block.ctaHref.trim()) return null;
  const external = /^https?:\/\//i.test(block.ctaHref);
  return (
    <Link
      href={block.ctaHref}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-105 active:scale-95"
    >
      {block.ctaLabel}
    </Link>
  );
}

export function LandingBannerBlock({ block }: { block: BannerBlock }) {
  if (block.layout === "image-background") {
    return (
      <section className="px-6 py-14 sm:py-20">
        <Reveal direction="fade">
          <div className="relative mx-auto flex min-h-[320px] w-full max-w-6xl flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-16 text-center sm:min-h-[380px]">
            {block.imageSrc ? (
              <Image
                src={block.imageSrc}
                alt={block.imageAlt || block.title}
                fill
                className="object-cover"
                sizes="1152px"
                unoptimized={shouldUnoptimizeImage(block.imageSrc)}
              />
            ) : (
              <div className="absolute inset-0 bg-primary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/25" />
            <div className="relative z-10 max-w-2xl text-white">
              {block.eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
                  {block.eyebrow}
                </p>
              ) : null}
              {block.title ? (
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  {block.title}
                </h2>
              ) : null}
              {block.text ? (
                <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 sm:text-base">
                  {block.text}
                </p>
              ) : null}
              <div className="mt-2 flex justify-center">
                <BannerCta block={block} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    );
  }

  const imageFirst = block.layout === "image-left";

  return (
    <section className="px-6 py-14 sm:py-20">
      <Reveal direction="fade">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted/30 ${
              imageFirst ? "md:order-1" : "md:order-2"
            }`}
          >
            {block.imageSrc ? (
              <Image
                src={block.imageSrc}
                alt={block.imageAlt || block.title}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 560px, 100vw"
                unoptimized={shouldUnoptimizeImage(block.imageSrc)}
              />
            ) : (
              <div className="absolute inset-0 bg-primary/10" />
            )}
          </div>

          <div className={imageFirst ? "md:order-2" : "md:order-1"}>
            {block.eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {block.eyebrow}
              </p>
            ) : null}
            {block.title ? (
              <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                {block.title}
              </h2>
            ) : null}
            {block.text ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/70 sm:text-base">
                {block.text}
              </p>
            ) : null}
            <BannerCta block={block} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
