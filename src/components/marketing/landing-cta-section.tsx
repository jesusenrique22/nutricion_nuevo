"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";

export function LandingCtaSection({ backgroundSrc }: { backgroundSrc: string }) {
  return (
    <section
      id="contacto"
      className="lobby-panel relative scroll-mt-20 overflow-hidden px-6 py-20 sm:min-h-[80svh] sm:py-24"
    >
      <Image
        src={backgroundSrc}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized={backgroundSrc.startsWith("/uploads/")}
      />
      <div className="absolute inset-0 bg-primary/55" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-accent-soft/25 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-1/4 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto flex min-h-[60svh] max-w-3xl flex-col items-center justify-center text-center text-primary-foreground">
        <Reveal direction="up">
          <h2 className="text-2xl font-bold sm:text-4xl">
            Tu mejor versión empieza hoy
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            Agenda tu primera consulta, completa tu anamnesis y accede a tu
            panel personal con seguimiento profesional.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-full bg-surface px-8 py-3.5 font-semibold text-primary shadow-lg transition hover:scale-105 active:scale-95"
          >
            Crear mi cuenta
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
