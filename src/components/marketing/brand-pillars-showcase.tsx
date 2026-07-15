"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { Reveal, RevealScale, StaggerReveal, StaggerRevealItem } from "@/components/motion/reveal";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type { LandingImagesData } from "@/types/landing-images";

const PILLARS = [
  {
    key: "nutrition" as const,
    label: "01",
    title: "Nutrición consciente",
    teaser: "Plan de alimentación personalizado, sin dietas extremas.",
    imageAlt: "Consulta nutricional — qué incluye",
  },
  {
    key: "training" as const,
    label: "02",
    title: "Entrenamiento a medida",
    teaser: "Rutinas pensadas para tu cuerpo, objetivos y estilo de vida.",
    imageAlt: "Plan de entrenamiento — qué incluye",
  },
  {
    key: "anthropometry" as const,
    label: "03",
    title: "Mediciones precisas",
    teaser: "Antropometría ISAK y composición corporal con estrategia.",
    imageAlt: "Análisis antropométrico — qué incluye",
  },
] as const;

const DETAIL_SIZE = { width: 2831, height: 1435 } as const;

const panelMotion = {
  initial: { opacity: 0, y: 28, scale: 0.97, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.98,
    filter: "blur(4px)",
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export function BrandPillarsShowcase({
  services,
}: {
  services?: LandingImagesData["services"];
  plans?: LandingImagesData["plans"];
}) {
  const serviceImages = services ?? DEFAULT_LANDING_IMAGES.services;
  const [active, setActive] = useState<(typeof PILLARS)[number]["key"]>(
    "nutrition",
  );

  const current = PILLARS.find((p) => p.key === active)!;
  const detailSrc = serviceImages[current.key];

  return (
    <section className="lobby-panel relative scroll-mt-20 overflow-hidden bg-muted/40 px-6 py-16 sm:min-h-[100svh] sm:py-20">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-accent-soft/45 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.65, 0.45] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col justify-center">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-foreground/60">
            Nuestro enfoque
          </p>
          <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">
            Tres pilares, un solo camino
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-foreground/65 sm:text-base">
            Cada servicio integral tiene su propio acompañamiento. Elegí un
            pilar y descubrí todo lo que incluye.
          </p>
        </Reveal>

        <StaggerReveal
          role="tablist"
          aria-label="Pilares de servicio"
          className="mt-10 flex flex-col gap-2 sm:mt-12 sm:flex-row sm:justify-center sm:gap-3"
        >
          {PILLARS.map((pillar) => {
            const selected = pillar.key === active;
            return (
              <StaggerRevealItem key={pillar.key} className="flex min-w-0 flex-1 sm:max-w-[16rem]">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(pillar.key)}
                  className={`flex w-full flex-col rounded-2xl border px-4 py-4 text-left transition sm:flex-1 ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground ring-1 ring-primary/20"
                      : "border-foreground/10 bg-surface text-foreground hover:border-primary/20 hover:bg-surface/90"
                  }`}
                >
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                    selected ? "text-primary-foreground/70" : "text-primary/50"
                  }`}
                >
                  {pillar.label}
                </span>
                <span className="mt-1 text-sm font-bold leading-tight">
                  {pillar.title}
                </span>
                <span
                  className={`mt-1.5 text-xs leading-snug ${
                    selected
                      ? "text-primary-foreground/80"
                      : "text-foreground/55"
                  }`}
                >
                  {pillar.teaser}
                </span>
                </button>
              </StaggerRevealItem>
            );
          })}
        </StaggerReveal>

        <RevealScale delay={0.15} className="relative mt-8 sm:mt-10">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-accent-soft/30 via-transparent to-primary/10"
            layoutId="pillar-glow"
            transition={{ type: "spring", stiffness: 200, damping: 28 }}
          />

          <div className="relative overflow-hidden rounded-3xl bg-surface ring-1 ring-primary/12">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                {...panelMotion}
                className="relative bg-[#f8ecef]"
              >
                <Image
                  src={detailSrc}
                  alt={current.imageAlt}
                  width={DETAIL_SIZE.width}
                  height={DETAIL_SIZE.height}
                  className="h-auto w-full"
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  priority={false}
                  loading="lazy"
                  unoptimized={shouldUnoptimizeImage(detailSrc)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </RevealScale>
      </div>
    </section>
  );
}
