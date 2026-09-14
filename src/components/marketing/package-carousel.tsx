"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** En móvil: tarjeta casi a ancho completo y centrada al hacer snap. */
const CARD_SIZES =
  "w-[min(100%,20.5rem)] shrink-0 snap-center sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

export function PackageCarousel({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 8);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateButtons();
    // Centrar la primera tarjeta en móvil
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    if (card && window.matchMedia("(max-width: 639px)").matches) {
      const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
      el.scrollLeft = Math.max(0, left);
    }
    updateButtons();
    el.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    return () => {
      el.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [updateButtons, children]);

  function scroll(direction: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    const gap = 24;
    const step = card ? card.offsetWidth + gap : el.clientWidth / 3;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  const items = Children.toArray(children);

  return (
    <div className="relative mt-10 w-full min-w-0 sm:mt-12">
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={!canPrev}
        aria-label={`Anterior — ${ariaLabel}`}
        className="absolute -left-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-35 sm:flex lg:left-0"
      >
        <ChevronIcon direction="left" />
      </button>

      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={!canNext}
        aria-label={`Siguiente — ${ariaLabel}`}
        className="absolute -right-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-35 sm:flex lg:right-0"
      >
        <ChevronIcon direction="right" />
      </button>

      <div
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        className="flex items-stretch gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [scrollbar-width:none] sm:gap-6 sm:px-14 [&::-webkit-scrollbar]:hidden max-sm:justify-start max-sm:px-[max(1rem,calc((100%-min(100%,20.5rem))/2))]"
      >
        {items.map((child, i) => (
          <div
            key={i}
            data-carousel-card
            className={`${CARD_SIZES} flex flex-col self-stretch`}
          >
            {child}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-primary-foreground/55 sm:hidden">
        Deslizá para ver más paquetes
      </p>
    </div>
  );
}
