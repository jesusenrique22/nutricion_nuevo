import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-foreground/5 bg-background/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-extrabold text-primary">
            NutriVida
          </Link>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link href="/resources" className="hover:text-primary">
              Recursos
            </Link>
            <Link href="/#paquetes" className="hover:text-primary">
              Paquetes
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-primary px-5 py-2 text-primary-foreground transition hover:scale-105"
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-foreground/5 bg-muted/50 px-6 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-foreground/60">
          © {new Date().getFullYear()} NutriVida. Hecho con cariño para tu
          bienestar.
        </div>
      </footer>
    </div>
  );
}
