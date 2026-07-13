"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/logo";
import { DarkSectionSparks } from "@/components/brand/dark-section-sparks";
import { BRAND_PROFILE } from "@/lib/brand-assets";

export const authInputClass =
  "mt-2 w-full rounded-xl border-0 border-b-2 border-primary/20 bg-transparent px-0 py-3.5 text-base text-primary outline-none transition placeholder:text-primary/30 focus:border-primary";

export const authButtonClass =
  "flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-semibold tracking-wide text-primary-foreground transition hover:bg-[#5a1728] active:scale-[0.98] disabled:opacity-50 sm:text-lg";

export const authLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/60";

/** Panel de formulario: superficie limpia para la interacción, sin “tarjeta” genérica. */
export function AuthFormCard({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

export function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="mt-8 text-center text-sm text-primary/55">
      {prompt}{" "}
      <Link
        href={href}
        className="font-semibold text-primary underline-offset-4 transition hover:underline"
      >
        {label}
      </Link>
    </p>
  );
}

function AuthBrandCopy({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative z-10 flex max-w-xl flex-col justify-between gap-10 text-white">
      <div className="flex items-center justify-between gap-4">
        <BrandLogoLink inverted tagline size="md" priority />
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-soft/90 sm:inline">
          Est. 2025 · BA
        </span>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent-soft">
          Acceso · Anttova
        </p>
        <h1 className="mt-4 text-[clamp(2.5rem,6vw,4.75rem)] font-extralight uppercase leading-[0.95] tracking-tight">
          {title}
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/78 sm:text-lg">
          {subtitle}
        </p>

        <div className="mt-10 flex items-center gap-4">
          <div className="relative h-[4.25rem] w-[4.25rem] overflow-hidden rounded-full ring-2 ring-accent-soft/50">
            <Image
              src={BRAND_PROFILE.professional}
              alt=""
              fill
              className="object-cover object-top"
              sizes="68px"
            />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">
              Lic. María Antonieta Lanza
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-accent-soft">
              Nutrición · Fitness · Wellness
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-white/45">
        Entrena tu cuerpo. Equilibra tu vida.
      </p>
    </div>
  );
}

/**
 * Lobby de acceso: composición brand (gradiente + tipografía),
 * formulario como panel de interacción — sin capturas de diapositivas.
 */
export function AuthShell({
  children,
  title,
  subtitle,
  formTitle = "Tu espacio",
  formHint = "Citas, planes y seguimiento en un solo lugar.",
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  formTitle?: string;
  formHint?: string;
}) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[#3a0f1a] lg:min-h-screen">
      {/* Atmosfera de marca — sin foto de capture */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a0812] via-[#741e31] to-[#8b2a42]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(242,181,204,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_70%,rgba(26,5,12,0.55),transparent_50%)]" />
        <div className="absolute -left-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-accent-soft/15 blur-3xl" />

        <p className="pointer-events-none absolute -left-[3%] bottom-[-0.12em] select-none text-[min(32vw,20rem)] font-extralight uppercase leading-none tracking-[-0.06em] text-white/[0.08]">
          antto
        </p>
        <p className="pointer-events-none absolute right-[-1%] top-[6%] hidden select-none text-[min(14vw,11rem)] font-extralight uppercase leading-none tracking-[-0.06em] text-accent-soft/[0.14] lg:block">
          va
        </p>

        <DarkSectionSparks count={90} className="opacity-70" />
      </div>

      {/* Contenido: brand + formulario en una composición */}
      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-[1400px] lg:min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Columna marca — desktop */}
        <section className="hidden flex-col justify-between px-10 py-12 lg:flex xl:px-16 xl:py-14">
          <AuthBrandCopy title={title} subtitle={subtitle} />
        </section>

        {/* Columna formulario */}
        <section className="relative flex flex-col justify-end lg:justify-center lg:py-10 lg:pr-10 xl:pr-14">
          {/* Móvil: encabezado sobre el flyer */}
          <div className="relative px-5 pb-6 pt-[max(1rem,env(safe-area-inset-top))] lg:hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <BrandLogoLink inverted tagline size="sm" priority />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                  Est. 2025
                </span>
              </div>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-soft">
                Acceso · Anttova
              </p>
              <h1 className="mt-3 text-4xl font-extralight uppercase leading-[0.95] tracking-tight text-white">
                {title}
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Panel de interacción */}
          <div className="relative rounded-t-[2rem] bg-[#f7f2f4] px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-8 shadow-[0_-24px_60px_-28px_rgba(26,5,12,0.55)] sm:px-8 lg:rounded-[2rem] lg:bg-white/95 lg:px-10 lg:py-10 lg:shadow-[0_40px_100px_-40px_rgba(26,5,12,0.65)] lg:backdrop-blur-md">
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-primary/15 lg:hidden" />

            <div className="mb-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/45">
                Ingreso seguro
              </p>
              <h2 className="mt-2 text-2xl font-extralight uppercase tracking-tight text-primary sm:text-3xl">
                {formTitle}
              </h2>
              <p className="mt-2 text-sm text-primary/55">{formHint}</p>
            </div>

            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
