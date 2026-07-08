"use client";

import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { DEFAULT_LANDING_BLOCKS } from "@/lib/landing-blocks-defaults";
import type { CarouselItem, CarouselSize } from "@/types/landing-blocks";

const SIZE_CLASSES: Record<CarouselSize, string> = {
  sm: "h-32 w-48 sm:h-36 sm:w-56",
  md: "h-44 w-64 sm:h-52 sm:w-80",
  lg: "h-56 w-80 sm:h-72 sm:w-[26rem]",
};

const SIZE_IMAGE_SIZES: Record<CarouselSize, string> = {
  sm: "224px",
  md: "320px",
  lg: "416px",
};

function fallbackItems(): CarouselItem[] {
  const first = DEFAULT_LANDING_BLOCKS.blocks[0];
  return first && first.kind === "carousel" ? first.items : [];
}

export function BrandGalleryStrip({
  items,
  title = "Balance · Energía · Bienestar",
  reverse = false,
  size = "md",
}: {
  items?: CarouselItem[];
  title?: string;
  reverse?: boolean;
  size?: CarouselSize;
}) {
  const gallery = items?.length ? items : fallbackItems();
  const loop = [...gallery, ...gallery];

  return (
    <section className="overflow-hidden bg-primary py-10 sm:py-14">
      {title ? (
        <Reveal direction="fade">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
            {title}
          </p>
        </Reveal>
      ) : null}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-primary to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-primary to-transparent sm:w-24" />
        <div
          className={`flex w-max gap-4 px-4 sm:gap-5 ${
            reverse ? "brand-marquee-reverse" : "brand-marquee"
          }`}
        >
          {loop.map((item, i) => (
            <div
              key={`${item.src}-${i}`}
              className={`relative shrink-0 overflow-hidden rounded-2xl ${SIZE_CLASSES[size]}`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover transition duration-500 hover:scale-105"
                sizes={SIZE_IMAGE_SIZES[size]}
                unoptimized={item.src.startsWith("/uploads/")}
              />
              {item.caption ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-10">
                  <p className="text-sm font-medium leading-snug text-white">
                    {item.caption}
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
