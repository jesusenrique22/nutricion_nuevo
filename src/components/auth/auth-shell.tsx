import { BrandLogoLink } from "@/components/brand/logo";
import Link from "next/link";

export const authInputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/12 bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:rounded-2xl";

export const authButtonClass =
  "flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition active:scale-[0.99] disabled:opacity-50 sm:rounded-[28px] sm:py-4 lg:hover:scale-[1.02]";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:min-h-screen lg:flex-row">
      {/* Móvil: barra superior compacta */}
      <header className="flex shrink-0 items-center justify-between bg-primary px-5 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] lg:hidden">
        <BrandLogoLink inverted tagline size="sm" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-soft/90">
          Est. 2025
        </span>
      </header>

      {/* Escritorio: panel lateral */}
      <aside className="relative hidden flex-col justify-between bg-primary px-12 py-14 text-primary-foreground lg:flex lg:w-[min(44%,480px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/3 h-56 w-56 rounded-full bg-accent-soft/20 blur-3xl"
        />

        <div className="relative">
          <BrandLogoLink inverted tagline size="md" />
        </div>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
            Est. 2025 · Buenos Aires
          </p>
          <h1 className="mt-6 text-4xl font-extralight uppercase leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/80">
            {subtitle}
          </p>

          <div className="mt-10">
            <div className="inline-flex flex-col gap-3 border-l border-primary-foreground/25 pl-5">
              <span className="text-xs uppercase tracking-[0.2em] text-accent-soft">
                Nutrición · Fitness · Wellness
              </span>
              <span className="text-xs text-primary-foreground/60">
                by María Antonieta Lanza
              </span>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-primary-foreground/50">
          © Anttova · Buenos Aires, Argentina
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-5 sm:px-6 sm:py-8 lg:max-w-md lg:flex-none lg:justify-center lg:px-16 lg:py-10">
          <div className="mb-5 lg:hidden">
            <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-primary">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-foreground/60">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AuthFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-foreground/8 bg-surface p-5 shadow-sm sm:p-6 lg:rounded-[28px] lg:border-0 lg:p-8 lg:shadow-xl lg:ring-1 lg:ring-foreground/5">
      {children}
    </div>
  );
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
    <p className="mt-auto pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-foreground/65 lg:mt-6 lg:pb-0">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-primary hover:underline">
        {label}
      </Link>
    </p>
  );
}
