"use client";

import { PackageCarousel } from "@/components/marketing/package-carousel";
import { PackageHeroImage } from "@/components/marketing/package-hero-image";
import { DarkSectionSparks } from "@/components/brand/dark-section-sparks";
import { DisplayPrice } from "@/components/currency/display-price";
import { Reveal, RevealScale } from "@/components/motion/reveal";
import Link from "next/link";
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
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 ${
        highlight
          ? "bg-accent-soft text-foreground ring-1 ring-primary/15"
          : "border border-white/10 bg-white/5 backdrop-blur-sm"
      }`}
    >
      <div className="relative shrink-0">
        <PackageHeroImage src={imageSrc} alt={pkg.name} />
        {!highlight && (
          <div className="pointer-events-none absolute inset-0 bg-primary/25" />
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-6 sm:p-7">
        <h3 className="line-clamp-2 min-h-[3.25rem] text-xl font-bold leading-snug">
          {pkg.name}
        </h3>
        <div
          tabIndex={0}
          className={`mt-3 h-[calc(1.625em*6)] overflow-y-auto overscroll-contain pr-1.5 text-sm leading-relaxed [scrollbar-gutter:stable] [scrollbar-width:thin] ${
            highlight ? "text-foreground/80" : "text-primary-foreground/70"
          }`}
        >
          <p>{pkg.description ?? "Consulta personalizada Anttova."}</p>
        </div>
        <div className="mt-auto pt-6">
          <div className="text-3xl font-extrabold">
            <DisplayPrice amount={pkg.price} currency="ARS" />
          </div>
          <Link
            href="/register"
            className={`mt-6 block w-full rounded-full px-5 py-2.5 text-center text-sm font-semibold transition active:scale-95 sm:text-base ${
              highlight
                ? "bg-primary text-primary-foreground hover:scale-105"
                : "bg-primary-foreground text-primary hover:scale-105"
            }`}
          >
            Agendar
          </Link>
        </div>
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
                <RevealScale key={pkg.id} delay={i * 0.08} className="flex h-full min-h-0 flex-col">
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