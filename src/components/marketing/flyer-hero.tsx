import Image from "next/image";
import { FlyerHeroClient } from "@/components/marketing/flyer-hero-client";
import { DEFAULT_LANDING_IMAGES } from "@/lib/landing-images-defaults";
import { limitHeroSlides } from "@/lib/landing-images-parse";
import { shouldUnoptimizeImage } from "@/lib/media-url";
import type { HeroSlide } from "@/types/landing-images";

/**
 * Hero LCP: la primera foto va en el HTML del servidor (sin esperar JS/hydration).
 * El carrusel y el copy animado viven en el client.
 */
export function FlyerHero({ slides }: { slides?: HeroSlide[] }) {
  const raw = slides?.length ? slides : DEFAULT_LANDING_IMAGES.heroSlides;
  const items = limitHeroSlides(raw);
  const first = items[0];

  if (!first) return null;

  return (
    <section
      id="inicio"
      className="lobby-panel relative min-h-[100svh] scroll-mt-20 overflow-hidden bg-primary"
    >
      <div className="absolute inset-0">
        {shouldUnoptimizeImage(first.src) ? (
          // /api/media: <img> nativo evita warnings LCP de next/image con unoptimized
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={first.src}
            alt={first.alt}
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <Image
            src={first.src}
            alt={first.alt}
            fill
            priority
            fetchPriority="high"
            loading="eager"
            className="object-cover object-center"
            sizes="100vw"
          />
        )}
      </div>

      <FlyerHeroClient slides={items} />
    </section>
  );
}
