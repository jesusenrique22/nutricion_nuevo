"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseIcon } from "@/components/ui/link-icons";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo, BrandLogoLink } from "@/components/brand/logo";
import { SidebarCurrencyBlock } from "@/components/currency/sidebar-currency-block";
import { iconForHref } from "@/components/dashboard/sidebar-icons";
import { useDashboardBadges } from "@/hooks/use-dashboard-badges";

interface NavLink {
  href: string;
  label: string;
}

const COLLAPSED_KEY = "anttova-sidebar-collapsed";

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
  collapsed = false,
}: {
  links: NavLink[];
  unreadNotifications: number;
  cartCount: number;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const items = [
    { href: "/dashboard", label: "Inicio" },
    ...links,
    { href: "/dashboard/notifications", label: "Notificaciones" },
  ];

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = iconForHref(item.href);
        const isCart = item.href.includes("/cart");
        const isNotif = item.href.includes("/notifications");
        const badge = isCart
          ? cartCount
          : isNotif
            ? unreadNotifications
            : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={item.label}
            aria-label={item.label}
            className={
              collapsed
                ? "relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground/90 transition hover:bg-white/10 hover:text-white"
                : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary-foreground/90 transition hover:bg-white/10 hover:text-white"
            }
          >
            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
              <Icon className="h-5 w-5" />
              {collapsed && badge > 0 && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-white ring-2 ring-primary" />
              )}
            </span>

            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {badge > 0 && <UnreadBadge count={badge} />}
              </>
            )}
          </Link>
        );
      })}
    </div>
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
  const [collapsed, setCollapsed] = useState(false);
  const reducedMotion = useReducedMotion();
  const { unreadNotifications } = useDashboardBadges();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          {badgeTotal > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-primary ring-2 ring-accent">
              {badgeTotal > 9 ? "9+" : badgeTotal}
            </span>
          )}
        </button>
      </header>

      <motion.aside
        className="relative hidden h-full shrink-0 flex-col overflow-hidden bg-primary p-3 text-primary-foreground md:flex"
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`flex ${
            collapsed
              ? "flex-col items-center gap-3"
              : "items-start justify-between gap-2 px-1"
          }`}
        >
          {collapsed ? (
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-accent-soft/25 ring-1 ring-white/20"
              title="Anttova"
              aria-label="Anttova"
            >
              <Image
                src="/brand/avatar-mark.svg"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7"
              />
            </Link>
          ) : (
            <BrandLogoLink inverted tagline />
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-accent-soft transition hover:bg-white/15"
            aria-label={collapsed ? "Mostrar menú" : "Ocultar menú"}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {!collapsed && (
          <span className="mt-3 shrink-0 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">
            {isAdmin ? "Panel profesional" : "Panel paciente"}
          </span>
        )}

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <NavItems
            links={links}
            unreadNotifications={unreadNotifications}
            cartCount={cartCount}
            collapsed={collapsed}
          />
        </nav>

        {!collapsed && (
          <div className="mt-4 shrink-0 space-y-3 px-1">
            <SidebarCurrencyBlock />
            {footer}
          </div>
        )}
      </motion.aside>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              aria-label="Cerrar menú"
              onClick={closeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw,18rem)] flex-col bg-primary p-6 text-primary-foreground shadow-[0_24px_60px_-16px_rgba(0,0,0,0.45)] md:hidden"
              initial={reducedMotion ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
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

              <nav className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
