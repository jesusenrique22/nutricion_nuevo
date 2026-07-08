import { MarketingHeader } from "@/components/marketing/marketing-header";
import { getNavMenu } from "@/server/queries/landing.queries";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navMenu = await getNavMenu();

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader items={navMenu.items} />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-foreground/5 bg-primary px-6 py-8 text-primary-foreground">
        <p className="mx-auto max-w-6xl text-center text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Anttova · Buenos Aires
        </p>
      </footer>
    </div>
  );
}
