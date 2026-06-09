"use client";

import { BrandFlowShell } from "@/components/brand/brand-flow-shell";
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
    <BrandFlowShell
      backHref="/dashboard/patient/appointments"
      backLabel="← Volver a mis citas"
      hub={{
        greeting: subtitle,
        compact: true,
      }}
    >
      {pendingLinks.length > 1 && (
        <div className="mx-auto mb-6 flex w-full max-w-[344px] flex-col gap-2">
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
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl rounded-[28px] bg-white p-5 shadow-md ring-1 ring-foreground/5 sm:p-8">
        <h1 className="text-center text-xl font-bold sm:text-2xl">{title}</h1>
        <p className="mt-3 rounded-2xl bg-accent/10 px-4 py-3 text-center text-sm text-foreground/80">
          {description}
        </p>
        <div className="mt-8">{children}</div>
      </div>
    </BrandFlowShell>
  );
}
