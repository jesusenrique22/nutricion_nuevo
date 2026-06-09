"use client";

import { BrandCharacter } from "@/components/brand/brand-character";
import {
  getProfileCharacterIds,
  type BrandCharacterId,
} from "@/lib/brand-characters";

export function ProfileEmojiBanner({
  name,
  subtitle,
  hasCompletedIntake,
  appointmentCount,
  measurementCount,
  statusLabel,
  statusTone = "primary",
}: {
  name: string;
  subtitle?: string;
  hasCompletedIntake: boolean;
  appointmentCount: number;
  measurementCount: number;
  statusLabel: string;
  statusTone?: "primary" | "accent";
}) {
  const characterIds = getProfileCharacterIds({
    hasCompletedIntake,
    appointmentCount: appointmentCount || (measurementCount > 0 ? 1 : 0),
  });

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary via-primary to-[#5a1728] p-6 text-primary-foreground shadow-xl shadow-primary/20 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-soft/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
            Ficha del paciente
          </p>
          <h1 className="mt-2 truncate text-2xl font-bold sm:text-3xl">
            {name}
          </h1>
          {subtitle && (
            <p className="mt-1 truncate text-sm text-primary-foreground/75">
              {subtitle}
            </p>
          )}
          <span
            className={`mt-4 inline-flex rounded-full px-4 py-1.5 text-sm font-bold ${
              statusTone === "primary"
                ? "bg-white/15 text-primary-foreground backdrop-blur-sm"
                : "bg-accent-soft text-foreground"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <CharacterStrip ids={characterIds} />
      </div>
    </section>
  );
}

function CharacterStrip({ ids }: { ids: BrandCharacterId[] }) {
  return (
    <div className="flex flex-wrap items-end justify-start gap-2 sm:justify-end">
      {ids.map((id, i) => (
        <BrandCharacter
          key={id}
          id={id}
          size={i === 0 ? "lg" : "md"}
          delay={i * 0.08}
        />
      ))}
    </div>
  );
}
