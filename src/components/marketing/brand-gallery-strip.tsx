"use client";

import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import type { GalleryItem } from "@/types/landing-images";

export function BrandGalleryStrip({
  items,
  title = "Balance · Energía · Bienestar",
  reverse = false,
}: {
  items?: GalleryItem[];
  title?: string;
  reverse?: boolean;
}) {
  const gallery = items?.length ? items : DEFAULT_LANDING_IMAGES.gallery;
  const loop = [...gallery, ...gallery];

  return (
    <section className="overflow-hidden bg-primary py-10 sm:py-14">
      <Reveal direction="fade">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
          {title}
        </p>
      </Reveal>
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
              className="relative h-44 w-64 shrink-0 overflow-hidden rounded-2xl sm:h-52 sm:w-80"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover transition duration-500 hover:scale-105"
                sizes="320px"
                unoptimized={item.src.startsWith("/uploads/")}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
