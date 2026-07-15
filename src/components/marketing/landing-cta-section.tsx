"use client";

import Image from "next/image";
import Link from "next/link";
import { shouldUnoptimizeImage } from "@/lib/media-url";

/** CTA final del lobby: sin Reveal repetido (el botón en el borde parpadeaba). */
export function LandingCtaSection({ backgroundSrc }: { backgroundSrc: string }) {
  return (
    <section className="lobby-panel relative scroll-mt-20 overflow-hidden px-6 py-24 sm:min-h-[70svh] sm:py-28">
      <Image
        src={backgroundSrc}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        loading="lazy"
        unoptimized={shouldUnoptimizeImage(backgroundSrc)}
      />
      <div className="absolute inset-0 bg-primary/55" />
      <div className="relative mx-auto flex min-h-[48svh] max-w-3xl flex-col items-center justify-center px-2 text-center text-primary-foreground">
        <h2 className="text-2xl font-bold sm:text-4xl">
          Tu mejor versión empieza hoy
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
          Agenda tu primera consulta, completa tu anamnesis y accede a tu panel
          personal con seguimiento profesional.
        </p>
        <Link
          href="/register"
          className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full bg-surface px-8 py-3.5 font-semibold text-primary shadow-lg transition hover:scale-105 active:scale-95"
        >
          Crear mi cuenta
        </Link>
      </div>
    </section>
  );
}
