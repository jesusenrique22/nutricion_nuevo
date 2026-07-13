"use client";

import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";

const RECIPE = [
  { label: "Alimentación", pct: 50, className: "bg-primary" },
  { label: "Ejercicio", pct: 30, className: "bg-[#5a1728]" },
  { label: "Descanso", pct: 10, className: "bg-foreground/80" },
  { label: "Buena energía y mentalidad", pct: 10, className: "bg-accent-soft" },
];

export function BrandPhilosophySection({
  imageSrc,
}: {
  imageSrc?: string;
}) {
  const src = imageSrc ?? DEFAULT_LANDING_IMAGES.philosophyImage;

  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal direction="left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/50">
              Nuestro enfoque
            </p>
            <h2 className="mt-2 text-3xl font-extralight uppercase leading-tight tracking-tight text-primary sm:text-4xl">
              Receta
              <br />
              para el
              <br />
              <span className="font-bold">éxito</span>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-foreground/70">
              Anttova integra nutrición, evaluación corporal y entrenamiento con
              foco en composición corporal, rendimiento y hábitos sostenibles.
            </p>

            <div className="mt-8 space-y-3">
              {RECIPE.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${item.className}`}
                  />
                  <span className="flex-1 text-sm text-foreground/75">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <p className="text-sm font-bold text-primary">Audiencia objetivo</p>
              <ul className="mt-3 space-y-2 text-sm text-foreground/65">
                <li>
                  Personas que buscan una vida más saludable y en balance.
                </li>
                <li>
                  Usuarios interesados en fitness, wellness y hábitos
                  sostenibles.
                </li>
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal direction="right" delay={0.1}>
          <div className="relative overflow-hidden rounded-3xl bg-muted/40 ring-1 ring-primary/10">
            <Image
              src={src}
              alt="Receta para el éxito Anttova"
              width={1200}
              height={800}
              className="h-auto w-full object-contain"
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized={src.startsWith("/uploads/")}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
