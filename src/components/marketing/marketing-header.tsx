"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo, BrandLogoLink } from "@/components/brand/logo";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { showsPublicCurrencySelector } from "@/lib/currency/visibility";
import { DEFAULT_NAV_MENU } from "@/lib/nav-menu-parse";
import type { NavMenuItem } from "@/types/nav-menu";
import {
  isLobbySectionId,
  scrollToLobbySection,
  type LobbySectionId,
} from "@/lib/lobby-scroll";

export type { LobbySectionId };

type ResolvedNavItem = {
  key: string;
  label: string;
  href: string;
  sectionId: LobbySectionId | null;
  matchPath: string | null;
  external: boolean;
};

function resolveItems(items: NavMenuItem[]): ResolvedNavItem[] {
  return items
    .filter((item) => item.enabled && item.label.trim() && item.target.trim())
    .map((item, index) => {
      if (item.type === "external") {
        return {
          key: `${item.id}-${index}`,
          label: item.label,
          href: item.target,
          sectionId: null,
          matchPath: null,
          external: true,
        };
      }
      if (item.type === "page") {
        return {
          key: `${item.id}-${index}`,
          label: item.label,
          href: item.target.startsWith("/") ? item.target : `/${item.target}`,
          sectionId: null,
          matchPath: item.target.startsWith("/") ? item.target : `/${item.target}`,
          external: false,
        };
      }
      const sectionId = isLobbySectionId(item.target) ? item.target : null;
      return {
        key: `${item.id}-${index}`,
        label: item.label,
        href: `/#${item.target}`,
        sectionId,
        matchPath: null,
        external: false,
      };
    });
}

function navClass(active: boolean) {
  return `group relative rounded-full px-3.5 py-2 transition ${
    active
      ? "bg-primary/10 font-semibold text-primary"
      : "text-foreground/70 hover:text-primary"
  }`;
}

export function MarketingHeader({ items }: { items?: NavMenuItem[] }) {
  const { data: session } = useSession();
  const authHref = session ? "/dashboard" : "/login";
  const authLabel = session ? "Mi Panel" : "Iniciar sesión";

  const pathname = usePathname();
  const isHome = pathname === "/";
  const showCurrency = showsPublicCurrencySelector(pathname);
  const navItems = resolveItems(items ?? DEFAULT_NAV_MENU.items);
  // false en SSR y 1er paint → sin mismatch de hidratación
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const lastY = useRef(0);
  const shift = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;
    shift.current = 0;

    const applyShift = (next: number) => {
      shift.current = next;
      const el = headerRef.current;
      if (!el) return;
      el.style.transform = next > 0.5 ? `translate3d(0, ${-next}px, 0)` : "";
      el.style.pointerEvents = next > el.offsetHeight * 0.6 ? "none" : "";
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY);
        const delta = y - lastY.current;
        lastY.current = y;

        setScrolled((was) => {
          const next = y > 12;
          return was === next ? was : next;
        });

        // Tope / rubber-band: siempre visible, sin pelear animaciones
        if (y <= 8) {
          applyShift(0);
          ticking.current = false;
          return;
        }

        // Ignorar micro-movimientos (subpixel / layout) que hacen titilar
        if (Math.abs(delta) < 0.5) {
          ticking.current = false;
          return;
        }

        const height = headerRef.current?.offsetHeight || 72;
        // Ocultar/mostrar al ritmo del scroll (poco a poco)
        const next = Math.min(height, Math.max(0, shift.current + delta));
        applyShift(next);
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isHome || typeof window === "undefined") return;
    const scrollFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash || !isLobbySectionId(hash)) return;
      requestAnimationFrame(() => scrollToLobbySection(hash));
    };
    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => window.removeEventListener("hashchange", scrollFromHash);
  }, [isHome, pathname]);

  const handleSectionNav = useCallback(
    (e: React.MouseEvent, id: LobbySectionId) => {
      if (!isHome) return;
      e.preventDefault();
      scrollToLobbySection(id);
      window.history.replaceState(null, "", `#${id}`);
    },
    [isHome],
  );

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b will-change-transform ${
        scrolled
          ? "border-primary/10 bg-surface/85 shadow-[0_8px_30px_-12px_rgba(116,30,49,0.25)] backdrop-blur-xl"
          : "border-foreground/5 bg-surface/90 backdrop-blur-md"
      }`}
      style={{
        transition:
          "background-color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
        <BrandLogoLink href="/#inicio" priority />

        <div className="hidden items-center gap-0.5 text-sm font-semibold md:flex">
          {navItems.map((item) => {
            const active = item.matchPath ? pathname === item.matchPath : false;

            if (item.external) {
              return (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={navClass(false)}
                >
                  {item.label}
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-accent transition group-hover:scale-x-100" />
                </a>
              );
            }

            if (item.sectionId) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={(e) => handleSectionNav(e, item.sectionId!)}
                  className={navClass(active)}
                >
                  {item.label}
                  <span
                    className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-primary transition ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            }

            return (
              <Link key={item.key} href={item.href} className={navClass(active)}>
                {item.label}
                <span
                  className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-primary transition ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
          {showCurrency && <CurrencySelector className="ml-1" />}
          <Link
            href={authHref}
            className="ml-2 inline-flex rounded-full bg-primary px-5 py-2 text-primary-foreground transition hover:bg-[#5a1728]"
          >
            {authLabel}
          </Link>
        </div>

        <MobileNav
          items={navItems}
          isHome={isHome}
          pathname={pathname}
          showCurrency={showCurrency}
          onSectionNav={handleSectionNav}
          authHref={authHref}
          authLabel={authLabel}
        />
      </nav>
    </header>
  );
}

function MobileNav({
  items,
  isHome,
  pathname,
  showCurrency,
  onSectionNav,
  authHref,
  authLabel,
}: {
  items: ResolvedNavItem[];
  isHome: boolean;
  pathname: string;
  showCurrency: boolean;
  onSectionNav: (e: React.MouseEvent, id: LobbySectionId) => void;
  authHref: string;
  authLabel: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-muted md:hidden"
        aria-label="Abrir menú"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/40 md:hidden"
              aria-label="Cerrar menú"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-surface/95 p-4 shadow-[0_16px_40px_-16px_rgba(116,30,49,0.35)] backdrop-blur-xl md:hidden"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between">
                <Link href="/#inicio" onClick={close}>
                  <BrandLogo />
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full px-3 py-1 text-sm font-semibold hover:bg-muted"
                  aria-label="Cerrar menú"
                >
                  ✕
                </button>
              </div>
              <div className="mt-6 flex flex-col gap-2 text-sm font-semibold">
                {items.map((item) => {
                  const active = item.matchPath
                    ? pathname === item.matchPath
                    : false;

                  if (item.external) {
                    return (
                      <a
                        key={item.key}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                        className="rounded-xl px-3 py-2.5 text-foreground/80 hover:bg-muted"
                      >
                        {item.label}
                      </a>
                    );
                  }

                  if (item.sectionId) {
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={(e) => {
                          if (isHome) onSectionNav(e, item.sectionId!);
                          close();
                        }}
                        className={`rounded-xl px-3 py-2.5 ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/80 hover:bg-muted"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={close}
                      className={`rounded-xl px-3 py-2.5 ${
                        active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {showCurrency && (
                  <div className="px-3 py-2">
                    <CurrencySelector />
                  </div>
                )}
                <Link
                  href={authHref}
                  onClick={close}
                  className="mt-2 block rounded-full bg-primary px-5 py-2.5 text-center text-primary-foreground"
                >
                  {authLabel}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
