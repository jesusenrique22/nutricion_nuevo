"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import type { LandingImagesData } from "@/types/landing-images";

const PILLARS = [
  {
    key: "nutrition" as const,
    title: "Nutrición consciente",
    teaser: "Plan de alimentación personalizado, sin dietas extremas.",
    imageAlt: "Consulta nutricional — qué incluye",
  },
  {
    key: "training" as const,
    title: "Entrenamiento a medida",
    teaser: "Rutinas pensadas para tu cuerpo, objetivos y estilo de vida.",
    imageAlt: "Plan de entrenamiento — qué incluye",
  },
  {
    key: "anthropometry" as const,
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
  plans,
}: {
  services?: LandingImagesData["services"];
  plans?: LandingImagesData["plans"];
}) {
  const serviceImages = services ?? DEFAULT_LANDING_IMAGES.services;
  const planImages = plans ?? DEFAULT_LANDING_IMAGES.plans;
  const [active, setActive] = useState<(typeof PILLARS)[number]["key"]>(
    "nutrition",
  );

  const current = PILLARS.find((p) => p.key === active)!;
  const detailSrc = serviceImages[current.key];
  const thumbSrc = planImages[current.key];

  return (
    <section className="relative overflow-hidden bg-muted/40 px-6 py-16 sm:py-20">
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

      <div className="relative mx-auto max-w-5xl">
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

        <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:justify-center">
          {PILLARS.map((pillar) => {
            const selected = pillar.key === active;
            return (
              <button
                key={pillar.key}
                type="button"
                onClick={() => setActive(pillar.key)}
                className={`group relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left transition sm:max-w-[15rem] sm:flex-col sm:items-start sm:px-4 sm:py-4 ${
                  selected
                    ? "border-primary/25 bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                    : "border-foreground/10 bg-surface/80 text-foreground hover:border-primary/20 hover:bg-surface"
                }`}
              >
                <div
                  className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl sm:h-14 sm:w-full sm:rounded-2xl ${
                    selected ? "ring-2 ring-primary-foreground/30" : ""
                  }`}
                >
                  <Image
                    src={planImages[pillar.key]}
                    alt=""
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-105"
                    sizes="80px"
                    unoptimized={planImages[pillar.key].startsWith("/uploads/")}
                  />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">
                    {pillar.title}
                  </span>
                  <span
                    className={`mt-1 hidden text-xs leading-snug sm:block ${
                      selected
                        ? "text-primary-foreground/80"
                        : "text-foreground/55"
                    }`}
                  >
                    {pillar.teaser}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative mt-8 sm:mt-10">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-accent-soft/30 via-transparent to-primary/10"
            layoutId="pillar-glow"
            transition={{ type: "spring", stiffness: 200, damping: 28 }}
          />

          <div className="relative overflow-hidden rounded-3xl bg-surface shadow-xl shadow-primary/10 ring-1 ring-foreground/8">
            <div className="flex items-center justify-between gap-4 border-b border-foreground/8 bg-gradient-to-r from-accent-soft/25 via-surface to-muted/30 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/55">
                  ¿Qué incluye?
                </p>
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={current.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.3 }}
                    className="mt-1 text-lg font-bold text-primary sm:text-xl"
                  >
                    {current.title}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <motion.div
                key={thumbSrc}
                initial={{ opacity: 0, rotate: -8, scale: 0.85 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative hidden h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-accent-soft/50 sm:block"
              >
                <Image
                  src={thumbSrc}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="64px"
                  unoptimized={thumbSrc.startsWith("/uploads/")}
                />
              </motion.div>
            </div>

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
                  priority={active === "nutrition"}
                  unoptimized={detailSrc.startsWith("/uploads/")}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
