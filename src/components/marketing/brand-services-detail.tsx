"use client";

import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealScale } from "@/components/motion/reveal";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import type { LandingImagesData } from "@/types/landing-images";

const SERVICES = [
  { key: "anthropometry" as const, alt: "Antropometría ISAK — qué incluye" },
  { key: "nutrition" as const, alt: "Consulta nutricional — qué incluye" },
  { key: "training" as const, alt: "Plan de entrenamiento — qué incluye" },
] as const;

const SERVICE_IMAGE = { width: 2831, height: 1435 } as const;

export function BrandServicesDetail({
  images,
}: {
  images?: LandingImagesData["services"];
}) {
  const serviceImages = images ?? DEFAULT_LANDING_IMAGES.services;

  return (
    <section className="bg-muted/30 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-foreground/50">
            ¿Qué incluye?
          </p>
          <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">
            Servicios integrales
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-foreground/65 sm:text-base">
            Nutrición + evaluación corporal + entrenamiento, con seguimiento real
            y educación para adherir a largo plazo.
          </p>
        </Reveal>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-7 sm:gap-8">
          {SERVICES.map((service, i) => (
            <RevealScale key={service.key} delay={i * 0.06}>
              <Link
                href="/login"
                className="group block overflow-hidden rounded-2xl shadow-lg shadow-primary/10 ring-1 ring-foreground/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-primary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:rounded-3xl"
                aria-label={`${service.alt} — iniciar sesión para reservar`}
              >
                <Image
                  src={serviceImages[service.key]}
                  alt={service.alt}
                  width={SERVICE_IMAGE.width}
                  height={SERVICE_IMAGE.height}
                  className="h-auto w-full transition duration-300 group-hover:brightness-[1.02]"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority={i === 0}
                  unoptimized={serviceImages[service.key].startsWith(
                    "/uploads/",
                  )}
                />
              </Link>
            </RevealScale>
          ))}
        </div>
      </div>
    </section>
  );
}
