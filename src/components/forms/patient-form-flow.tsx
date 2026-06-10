"use client";

import Link from "next/link";
import { BrandLinkButton } from "@/components/brand/brand-link-button";

export function PatientFormFlow({
  title,
  subtitle,
  description,
  pendingLinks,
  activeSlot,
  children,
}: {
  title: string;
  subtitle: string;
  description: string;
  pendingLinks: { href: string; label: string; subtitle: string }[];
  activeSlot: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/patient/appointments"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Volver a mis citas
        </Link>
        <p className="text-sm text-foreground/60">{subtitle}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        {pendingLinks.length > 1 && (
          <aside className="flex shrink-0 flex-col gap-2 lg:w-56">
            {pendingLinks.map((p, i) => (
              <BrandLinkButton
                key={p.href}
                href={p.href}
                label={p.label}
                subtitle={p.subtitle}
                selected={i === activeSlot}
                delay={i * 0.04}
              />
            ))}
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white shadow-md ring-1 ring-foreground/5">
          <header className="shrink-0 border-b border-foreground/5 px-5 py-4 sm:px-8 sm:py-5">
            <h1 className="text-xl font-bold text-primary sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">
              {description}
            </p>
          </header>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4 sm:px-8 sm:py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
