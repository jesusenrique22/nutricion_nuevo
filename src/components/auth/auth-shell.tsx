import { BrandLogoLink } from "@/components/brand/logo";
import Link from "next/link";

export const authInputClass =
  "mt-1.5 w-full rounded-xl border border-foreground/12 bg-white px-4 py-[clamp(0.75rem,2.2vh,1rem)] text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:rounded-2xl md:text-[1.05rem] md:py-3.5";

export const authButtonClass =
  "flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-[clamp(0.875rem,2.2vh,1.125rem)] text-base font-semibold text-primary-foreground shadow-md transition active:scale-[0.99] disabled:opacity-50 sm:rounded-[28px] md:text-lg md:py-4 lg:hover:scale-[1.02]";

export const authLabelClass = "text-sm font-semibold sm:text-base";

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
      <aside className="relative hidden flex-col justify-between bg-primary px-[clamp(2rem,4vw,3.5rem)] py-[clamp(2.5rem,5vh,3.5rem)] text-primary-foreground lg:flex lg:w-[min(40%,34rem)] xl:w-[min(38%,38rem)]">
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
      <main className="flex min-h-0 flex-1 flex-col lg:items-center lg:justify-center lg:p-[clamp(1.5rem,4vw,3rem)]">
        <div className="mx-auto flex w-full max-w-[min(100%,40rem)] flex-1 flex-col justify-center px-[clamp(1.25rem,5vw,2.5rem)] py-[clamp(1rem,3vh,2rem)] lg:max-w-[min(40rem,92%)] lg:flex-none lg:px-0 lg:py-0">
          <div className="mb-[clamp(1rem,3vh,1.5rem)] lg:hidden">
            <h1 className="text-[clamp(1.5rem,5vw,1.85rem)] font-bold leading-tight tracking-tight text-primary">
              {title}
            </h1>
            <p className="mt-2 text-[clamp(0.875rem,3.5vw,1rem)] leading-relaxed text-foreground/60">
              {subtitle}
            </p>
          </div>

          <div className="flex w-full flex-col lg:flex-none">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AuthFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-2xl border border-foreground/8 bg-surface p-[clamp(1.25rem,4vw,2rem)] shadow-sm sm:p-6 lg:rounded-[28px] lg:border-0 lg:p-[clamp(1.75rem,3vw,2.5rem)] lg:shadow-xl lg:ring-1 lg:ring-foreground/5">
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
    <p className="mt-[clamp(1.25rem,3vh,1.75rem)] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-foreground/65 sm:text-base lg:pb-0">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-primary hover:underline">
        {label}
      </Link>
    </p>
  );
}
