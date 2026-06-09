"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";

export function LandingHero() {
  const { scrollYProgress } = useScroll();
  const imageY = useTransform(scrollYProgress, [0, 0.45], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 0.45], ["0%", "8%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.35], [0.55, 0.75]);

  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      <motion.div
        style={{ y: imageY }}
        className="absolute inset-0 -top-[10%] h-[120%] w-full"
      >
        <Image
          src="/brand/hero.jpg"
          alt="Comunidad Anttova entrenando al aire libre"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </motion.div>

      <motion.div
        style={{ opacity: overlayOpacity }}
        className="absolute inset-0 bg-primary"
      />

      <motion.div
        aria-hidden
        animate={{ y: [0, -12, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-16 top-24 h-48 w-48 rounded-full bg-accent-soft/40 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, 14, 0], x: [0, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-10 bottom-32 h-40 w-40 rounded-full bg-white/15 blur-2xl"
      />

      <motion.div
        style={{ y: contentY }}
        className="relative flex min-h-[88vh] flex-col items-center justify-center px-6 py-24 text-center text-primary-foreground"
      >
        <Reveal direction="fade">
          <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur-sm">
            Est. 2025 · Buenos Aires
          </span>
        </Reveal>
        <Reveal delay={0.12} direction="up">
          <div className="mt-8 flex justify-center">
            <BrandLogo size="lg" inverted tagline />
          </div>
        </Reveal>
        <Reveal delay={0.22} direction="up">
          <p className="mx-auto mt-8 max-w-2xl text-base text-primary-foreground/90 sm:text-lg">
            Te ayudamos a construir una vida más saludable y en balance.
            Nutrición, entrenamiento y antropometría en un solo lugar.
          </p>
        </Reveal>
        <Reveal delay={0.32} direction="up">
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-surface px-7 py-3 font-semibold text-primary shadow-lg transition hover:scale-105 active:scale-95"
            >
              Empezar ahora
            </Link>
            <Link
              href="#paquetes"
              className="rounded-full border border-white/30 bg-white/10 px-7 py-3 font-semibold text-primary-foreground backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
            >
              Ver paquetes
            </Link>
          </div>
        </Reveal>
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent"
      />
    </section>
  );
}
