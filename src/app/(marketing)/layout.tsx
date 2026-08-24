import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import {
  collectCriticalLandingUrls,
  CriticalImagePreload,
} from "@/lib/preload-critical-images";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { getLandingImages, getNavMenu } from "@/server/queries/landing.queries";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navMenu, imagesResult] = await Promise.all([
    getNavMenu(),
    getLandingImages().catch(() => DEFAULT_LANDING_IMAGES),
  ]);
  const criticalImageUrls = collectCriticalLandingUrls(imagesResult);

  return (
    <MarketingShell criticalImageUrls={criticalImageUrls}>
      <CriticalImagePreload urls={criticalImageUrls} />
      <MarketingHeader items={navMenu.items} />
      <main className="flex-1">{children}</main>
      <footer className="relative z-10 w-full border-t border-white/10 bg-primary px-4 py-8 text-primary-foreground sm:px-6">
        <p className="mx-auto max-w-6xl text-center text-sm font-medium text-primary-foreground/90">
          © {new Date().getFullYear()} Anttova · Buenos Aires
        </p>
      </footer>
    </MarketingShell>
  );
}
