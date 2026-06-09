"use client";

import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealScale } from "@/components/motion/reveal";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import type { LandingImagesData } from "@/types/landing-images";

const SERVICE_COPY = [
  {
    key: "anthropometry" as const,
    title: "Antropometría ISAK",
    desc: "Conoce tu composición corporal real. Alimentate y entrena con estrategia.",
  },
  {
    key: "nutrition" as const,
    title: "Consulta nutricional",
    desc: "Aprende a comer mejor, sin dietas extremas. Un plan que se adapta a vos.",
  },
  {
    key: "training" as const,
    title: "Plan de entrenamiento",
    desc: "Entrena con un plan pensado para tu cuerpo, tus objetivos y tu estilo de vida.",
  },
];

export function BrandServicesDetail({
  images,
}: {
  images?: LandingImagesData["services"];
}) {
  const serviceImages = images ?? DEFAULT_LANDING_IMAGES.services;

  return (
    <section className="bg-muted/30 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-foreground/50">
            ¿Qué incluye?
          </p>
          <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">
            Servicios integrales
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-foreground/65">
            Nutrición + evaluación corporal + entrenamiento, con seguimiento real
            y educación para adherir a largo plazo.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {SERVICE_COPY.map((service, i) => (
            <RevealScale key={service.title} delay={i * 0.08}>
              <article className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-primary/5 ring-1 ring-foreground/5 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/20">
                  <Image
                    src={serviceImages[service.key]}
                    alt={service.title}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    unoptimized={serviceImages[service.key].startsWith(
                      "/uploads/",
                    )}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-primary">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                    {service.desc}
                  </p>
                </div>
              </article>
            </RevealScale>
          ))}
        </div>

        <Reveal direction="fade" delay={0.2}>
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-block rounded-full border border-primary px-8 py-3 text-sm font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Reservá un turno
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
