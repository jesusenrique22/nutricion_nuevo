"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo, BrandLogoLink } from "@/components/brand/logo";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { showsPublicCurrencySelector } from "@/lib/currency/visibility";
import {
  isLobbySectionId,
  scrollToLobbySection,
  type LobbySectionId,
} from "@/lib/lobby-scroll";

export type { LobbySectionId };

const NAV: {
  id: LobbySectionId | null;
  href: string;
  label: string;
  matchPath?: string;
}[] = [
  { id: "inicio", href: "/#inicio", label: "Inicio" },
  {
    id: null,
    href: "/nutricionista",
    label: "Sobre mí",
    matchPath: "/nutricionista",
  },
  { id: "paquetes", href: "/#paquetes", label: "Paquetes" },
  {
    id: null,
    href: "/resources",
    label: "Recursos",
    matchPath: "/resources",
  },
  { id: "contacto", href: "/#contacto", label: "Contáctame" },
];

function navLinkClass(active: boolean) {
  return `rounded-full px-4 py-2 transition ${
    active
      ? "bg-primary/10 font-semibold text-primary"
      : "text-foreground/70 hover:bg-muted hover:text-primary"
  }`;
}

export function MarketingHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const showCurrency = showsPublicCurrencySelector(pathname);

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
    <header className="sticky top-0 z-50 border-b border-foreground/5 bg-surface/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <BrandLogoLink href="/#inicio" />

        <div className="hidden items-center gap-1 text-sm font-semibold md:flex">
          {NAV.map((item) => {
            const active = item.matchPath
              ? item.matchPath === "/nutricionista"
                ? pathname === "/nutricionista"
                : pathname === item.matchPath
              : false;

            if (item.id) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleSectionNav(e, item.id!)}
                  className={navLinkClass(active)}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(active)}
              >
                {item.label}
              </Link>
            );
          })}
          {showCurrency && <CurrencySelector className="ml-1" />}
          <Link
            href="/login"
            className="ml-2 rounded-full bg-primary px-5 py-2 text-primary-foreground transition hover:bg-foreground/90"
          >
            Iniciar sesión
          </Link>
        </div>

        <MobileNav
          isHome={isHome}
          pathname={pathname}
          showCurrency={showCurrency}
          onSectionNav={handleSectionNav}
        />
      </nav>
    </header>
  );
}

function MobileNav({
  isHome,
  pathname,
  showCurrency,
  onSectionNav,
}: {
  isHome: boolean;
  pathname: string;
  showCurrency: boolean;
  onSectionNav: (e: React.MouseEvent, id: LobbySectionId) => void;
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-muted md:hidden"
        aria-label="Abrir menú"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            aria-label="Cerrar menú"
            onClick={close}
          />
          <div className="fixed inset-x-0 top-0 z-50 border-b border-foreground/10 bg-surface p-4 shadow-xl md:hidden">
            <div className="flex items-center justify-between">
              <Link href="/#inicio" onClick={close}>
                <BrandLogo />
              </Link>
              <button type="button" onClick={close} className="rounded-full px-3 py-1 text-sm font-semibold hover:bg-muted" aria-label="Cerrar menú">
                ✕
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-2 text-sm font-semibold">
              {NAV.map((item) => {
                const active = item.matchPath
                  ? item.matchPath === "/nutricionista"
                    ? pathname === "/nutricionista"
                    : pathname === item.matchPath
                  : false;

                if (item.id) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        if (isHome) onSectionNav(e, item.id!);
                        close();
                      }}
                      className={`rounded-xl px-3 py-2.5 ${active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted"}`}
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={`rounded-xl px-3 py-2.5 ${active ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
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
              <Link href="/login" onClick={close} className="mt-2 rounded-full bg-primary px-5 py-2.5 text-center text-primary-foreground">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
