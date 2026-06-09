import { BrandLogo, BrandLogoLink } from "@/components/brand/logo";
import Link from "next/link";

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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative flex flex-col justify-between bg-primary px-8 py-10 text-primary-foreground lg:w-[min(44%,480px)] lg:px-12 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/3 h-56 w-56 rounded-full bg-accent-soft/20 blur-3xl"
        />

        <div className="relative">
          <BrandLogoLink inverted tagline size="md" />
        </div>

        <div className="relative my-10 lg:my-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-soft">
            Est. 2025 · Buenos Aires
          </p>
          <h1 className="mt-6 text-3xl font-extralight uppercase leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/80">
            {subtitle}
          </p>

          <div className="mt-10 hidden lg:block">
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

        <p className="relative hidden text-xs text-primary-foreground/50 lg:block">
          © Anttova · Buenos Aires, Argentina
        </p>
      </aside>

      <main className="flex flex-1 flex-col justify-center bg-background px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

export function AuthFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] bg-surface p-6 shadow-xl ring-1 ring-foreground/5 sm:p-8">
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
    <p className="mt-6 text-center text-sm text-foreground/65">
      {prompt}{" "}
      <Link href={href} className="font-semibold text-primary hover:underline">
        {label}
      </Link>
    </p>
  );
}
