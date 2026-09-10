"use client";

import Image from "next/image";
import Link from "next/link";
import { PackageCarousel } from "@/components/marketing/package-carousel";
import { DarkSectionSparks } from "@/components/brand/dark-section-sparks";
import { DisplayPrice } from "@/components/currency/display-price";
import { Reveal, RevealScale } from "@/components/motion/reveal";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type { ConsultationTypeDTO } from "@/server/actions/booking.queries";
import type { LandingImagesData } from "@/types/landing-images";

const PLAN_KEY_BY_CODE: Record<string, keyof LandingImagesData["plans"]> = {
  NUT_01: "nutrition",
  ENT_02: "training",
  ANT_03: "anthropometry",
};

function planImageForCode(
  pkg: ConsultationTypeDTO,
  plans: LandingImagesData["plans"],
): string {
  if (pkg.imageUrl) return pkg.imageUrl;
  const key = PLAN_KEY_BY_CODE[pkg.code];
  return key ? plans[key] : plans.nutrition;
}

function ConsultationPackageCard({
  pkg,
  highlight,
  imageSrc,
}: {
  pkg: ConsultationTypeDTO;
  highlight: boolean;
  imageSrc: string;
}) {
  return (
    <div
      className={`flex h-full flex-1 flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 ${
        highlight
          ? "bg-accent-soft text-foreground ring-1 ring-primary/15"
          : "border border-white/10 bg-white/5 backdrop-blur-sm"
      }`}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/20">
        <Image
          src={imageSrc}
          alt={pkg.name}
          fill
          className="object-cover object-top"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          loading="lazy"
          unoptimized={shouldUnoptimizeImage(imageSrc)}
        />
        {!highlight && <div className="absolute inset-0 bg-primary/25" />}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-xl font-bold min-h-[3.25rem] flex items-start line-clamp-2">{pkg.name}</h3>
        <p
          className={`mt-3 flex-1 text-sm leading-relaxed ${
            highlight ? "text-foreground/80" : "text-primary-foreground/70"
          }`}
        >
          {pkg.description ?? "Consulta personalizada Anttova."}
        </p>
        <div className="mt-6 text-3xl font-extrabold">
          <DisplayPrice amount={pkg.price} currency="ARS" />
        </div>
        <Link
          href="/register"
          className={`mt-6 w-full rounded-full px-5 py-2.5 text-center text-sm font-semibold transition active:scale-95 sm:text-base ${
            highlight
              ? "bg-primary text-primary-foreground hover:scale-105"
              : "bg-primary-foreground text-primary hover:scale-105"
          }`}
        >
          Agendar
        </Link>
      </div>
    </div>
  );
}

export function LandingPackagesSection({
  consultations,
  planImages,
}: {
  consultations: ConsultationTypeDTO[];
  planImages: LandingImagesData["plans"];
}) {
  return (
    <section
      id="paquetes"
      className="lobby-panel relative scroll-mt-20 bg-primary text-primary-foreground"
    >
      <DarkSectionSparks />
      <div className="relative flex min-h-[100svh] flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto w-full min-w-0 max-w-6xl">
          <Reveal direction="fade">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
              Servicios
            </p>
            <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">
              Paquetes disponibles
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-center text-sm text-primary-foreground/75 sm:text-base">
              Elige el servicio que necesitas y agenda tu cita en línea.
            </p>
          </Reveal>

          {consultations.length === 0 ? (
            <p className="mt-10 text-center text-sm text-primary-foreground/70">
              Próximamente nuevos servicios.
            </p>
          ) : (
            <PackageCarousel ariaLabel="Paquetes de consulta">
              {consultations.map((pkg, i) => (
                <RevealScale key={pkg.id} delay={i * 0.08} className="flex h-full flex-1 flex-col">
                  <ConsultationPackageCard
                    pkg={pkg}
                    highlight={i === 0}
                    imageSrc={planImageForCode(pkg, planImages)}
                  />
                </RevealScale>
              ))}
            </PackageCarousel>
          )}
        </div>
      </div>
    </section>
  );
}