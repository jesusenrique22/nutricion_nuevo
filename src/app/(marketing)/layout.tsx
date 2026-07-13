import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { getNavMenu } from "@/server/queries/landing.queries";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navMenu = await getNavMenu();

  return (
    <MarketingShell>
      <MarketingHeader items={navMenu.items} />
      <main className="flex-1">{children}</main>
      <footer className="relative z-10 border-t border-white/10 bg-primary px-6 py-8 text-primary-foreground">
        <p className="mx-auto max-w-6xl text-center text-sm font-medium text-primary-foreground/90">
          © {new Date().getFullYear()} Anttova · Buenos Aires
        </p>
      </footer>
    </MarketingShell>
  );
}
