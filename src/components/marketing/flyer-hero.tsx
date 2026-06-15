"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { limitHeroSlides } from "@/lib/landing-images-parse";
import type { HeroSlide } from "@/types/landing-images";

export function FlyerHero({ slides }: { slides?: HeroSlide[] }) {
  const raw = slides?.length ? slides : DEFAULT_LANDING_IMAGES.heroSlides;
  const items = limitHeroSlides(raw);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [items.length]);

  const slide = items[index];

  return (
    <section
      id="inicio"
      className="lobby-panel relative min-h-[100svh] scroll-mt-20 overflow-hidden bg-primary"
    >
      {items.map((s, i) => (
        <motion.div
          key={`${s.src}-${i}`}
          aria-hidden={i !== index}
          initial={false}
          animate={{
            opacity: i === index ? 1 : 0,
            scale: i === index ? 1 : 1.04,
          }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={s.src}
            alt={s.alt}
            fill
            priority={i === 0}
            loading="eager"
            fetchPriority={i === 0 ? "high" : "auto"}
            className="object-cover object-center"
            sizes="100vw"
            unoptimized={s.src.startsWith("/uploads/")}
          />
        </motion.div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-primary/92 via-primary/55 to-primary/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/25" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/4 h-[420px] w-[420px] rounded-full bg-accent-soft/25 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-[min(100svh,920px)] max-w-6xl flex-col justify-between px-6 pb-10 pt-24 sm:px-10 sm:pb-12 sm:pt-28">
        <div className="my-auto max-w-2xl py-8 sm:py-12">
          <motion.p
            key={`${slide.src}-eyebrow`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-soft"
          >
            Est. 2025 · Buenos Aires
          </motion.p>

          <AnimatePresence mode="wait">
            <motion.div
              key={slide.src}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6"
            >
              <h1 className="text-4xl font-extralight uppercase leading-[1.05] tracking-tight text-primary-foreground sm:text-5xl md:text-6xl">
                {slide.line1}
              </h1>
              <p className="mt-3 text-lg font-medium text-primary-foreground/90 sm:text-xl md:text-2xl">
                {slide.line2}
              </p>
            </motion.div>
          </AnimatePresence>

          <p className="mt-8 max-w-lg text-base leading-relaxed text-primary-foreground/80 sm:text-lg">
            Acompañamiento profesional con la Lic. Ma Antonieta Lanza.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="rounded-full bg-primary-foreground px-8 py-3.5 text-sm font-semibold text-primary shadow-lg transition hover:scale-105"
            >
              Empezar ahora
            </Link>
            <Link
              href="#paquetes"
              className="rounded-full border border-primary-foreground/35 bg-primary-foreground/10 px-8 py-3.5 text-sm font-semibold text-primary-foreground backdrop-blur-sm transition hover:bg-primary-foreground/20"
            >
              Ver paquetes
            </Link>
          </div>
        </div>

        <div className="flex gap-2">
          {items.map((s, i) => (
            <button
              key={`${s.src}-dot-${i}`}
              type="button"
              aria-label={`Ir a slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-10 bg-primary-foreground"
                  : "w-4 bg-primary-foreground/35 hover:bg-primary-foreground/55"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
