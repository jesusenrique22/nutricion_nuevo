"use client";

import Link from "next/link";
import { CloseIcon } from "@/components/ui/link-icons";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo, BrandLogoLink } from "@/components/brand/logo";
import { SidebarCurrencyBlock } from "@/components/currency/sidebar-currency-block";
import { useDashboardBadges } from "@/hooks/use-dashboard-badges";

interface NavLink {
  href: string;
  label: string;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-primary shadow-md ring-2 ring-accent">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavItems({
  links,
  unreadNotifications,
  cartCount,
  onNavigate,
}: {
  links: NavLink[];
  unreadNotifications: number;
  cartCount: number;
  onNavigate?: () => void;
}) {
  const linkClass =
    "rounded-xl px-4 py-2.5 font-semibold transition hover:bg-white/10";

  return (
    <>
      <Link href="/dashboard" className={linkClass} onClick={onNavigate}>
        Inicio
      </Link>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex items-center justify-between ${linkClass}`}
          onClick={onNavigate}
        >
          <span>{l.label}</span>
          {l.href.includes("/cart") && cartCount > 0 && (
            <UnreadBadge count={cartCount} />
          )}
        </Link>
      ))}
      <Link
        href="/dashboard/notifications"
        className={`flex items-center justify-between ${linkClass}`}
        onClick={onNavigate}
      >
        Notificaciones
        <UnreadBadge count={unreadNotifications} />
      </Link>
    </>
  );
}

export function DashboardSidebar({
  isAdmin,
  links,
  footer,
  cartCount = 0,
}: {
  isAdmin: boolean;
  links: NavLink[];
  footer: ReactNode;
  cartCount?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { unreadNotifications } = useDashboardBadges();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const badgeTotal = unreadNotifications + cartCount;

  return (
    <>
      <header className="z-40 flex shrink-0 items-center justify-between border-b border-foreground/5 bg-primary px-4 py-3 text-primary-foreground md:hidden">
        <BrandLogoLink inverted size="sm" />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10"
          aria-label="Abrir menú"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          {badgeTotal > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-primary ring-2 ring-accent">
              {badgeTotal > 9 ? "9+" : badgeTotal}
            </span>
          )}
        </button>
      </header>

      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden bg-primary p-6 text-primary-foreground md:flex">
        <BrandLogoLink inverted tagline />
        <span className="mt-3 shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">
          {isAdmin ? "Panel profesional" : "Panel paciente"}
        </span>

        <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <NavItems
            links={links}
            unreadNotifications={unreadNotifications}
            cartCount={cartCount}
          />
        </nav>

        <div className="mt-4 shrink-0 space-y-3">
          <SidebarCurrencyBlock />
          {footer}
        </div>
      </aside>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw,18rem)] flex-col bg-primary p-6 text-primary-foreground shadow-2xl md:hidden">
            <div className="flex items-start justify-between gap-3">
              <Link href="/dashboard" onClick={closeMenu}>
                <BrandLogo inverted tagline />
              </Link>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-full px-3 py-1 text-sm font-semibold text-accent-soft hover:bg-white/10"
                aria-label="Cerrar menú"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <span className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">
              {isAdmin ? "Panel profesional" : "Panel paciente"}
            </span>

            <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
              <NavItems
                links={links}
                unreadNotifications={unreadNotifications}
                cartCount={cartCount}
                onNavigate={closeMenu}
              />
            </nav>

            <div className="space-y-3">
              <SidebarCurrencyBlock />
              <div onClick={closeMenu}>{footer}</div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
