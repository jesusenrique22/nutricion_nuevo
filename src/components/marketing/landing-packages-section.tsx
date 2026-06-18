"use client";

import Image from "next/image";
import Link from "next/link";
import { PackageCarousel } from "@/components/marketing/package-carousel";
import { DisplayPrice } from "@/components/currency/display-price";
import { Reveal } from "@/components/motion/reveal";
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
      className={`flex h-full flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:shadow-xl ${
        highlight
          ? "bg-accent-soft text-foreground shadow-lg"
          : "border border-white/10 bg-white/5 backdrop-blur-sm"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted/20">
        <Image
          src={imageSrc}
          alt={pkg.name}
          fill
          className="object-cover object-top"
          sizes="380px"
          unoptimized={imageSrc.startsWith("/uploads/")}
        />
        {!highlight && <div className="absolute inset-0 bg-primary/25" />}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-xl font-bold">{pkg.name}</h3>
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
          className={`mt-6 rounded-full px-5 py-2.5 text-center font-semibold transition active:scale-95 ${
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
      className="lobby-panel scroll-mt-20 bg-primary text-primary-foreground"
    >
      <div className="flex min-h-[100svh] flex-col justify-center px-6 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <Reveal direction="fade">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
              Servicios
            </p>
            <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">
              Paquetes disponibles
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-primary-foreground/75 sm:text-base">
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
                <ConsultationPackageCard
                  key={pkg.id}
                  pkg={pkg}
                  highlight={i === 0}
                  imageSrc={planImageForCode(pkg, planImages)}
                />
              ))}
            </PackageCarousel>
          )}
        </div>
      </div>
    </section>
  );
}
