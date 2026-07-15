import type { ReactNode } from "react";

function Svg({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5 shrink-0"}
      width={20}
      height={20}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconHome({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </Svg>
  );
}

export function IconCalendar({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </Svg>
  );
}

export function IconUsers({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 19.5c.4-1.8 1.7-3.2 3.8-3.7" />
    </Svg>
  );
}

export function IconTag({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M20 12.5 12.5 20a2 2 0 0 1-2.8 0L4 14.3V4h10.3l5.7 5.7a2 2 0 0 1 0 2.8Z" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconWallet({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12.5v3" />
      <rect x="3.5" y="8" width="17" height="12" rx="2" />
      <path d="M16 14h2.5" />
    </Svg>
  );
}

export function IconChart({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 19.5h16" />
      <path d="M7 16V10M12 16V6.5M17 16v-4" />
    </Svg>
  );
}

export function IconBook({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16.5H6.5A2.5 2.5 0 0 0 4 22" />
      <path d="M4 5.5v16.5" />
    </Svg>
  );
}

export function IconStar({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m12 3.5 2.4 5 5.4.7-4 3.8 1 5.3L12 15.7 7.2 18.3l1-5.3-4-3.8 5.4-.7Z" />
    </Svg>
  );
}

export function IconSliders({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 7h10M18 7h2M12 17h8M4 17h4" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Svg>
  );
}

export function IconProgress({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 19.5 10 11l4 4 6-10" />
      <path d="M16 5.5h4v4" />
    </Svg>
  );
}

export function IconCart({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3.5 5h2l1.8 10.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L20 8.5H7" />
      <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconBell({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M7 17.5h10" />
      <path d="M6 10.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14.5 6 10.5Z" />
      <path d="M10.5 17.5a1.5 1.5 0 0 0 3 0" />
    </Svg>
  );
}

export function IconBox({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" />
      <path d="M12 12v8.5M20 8l-8 4L4 8" />
    </Svg>
  );
}

export function IconAppointments({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

/** Mapea rutas del panel a iconos. */
export function iconForHref(href: string) {
  if (href === "/dashboard") return IconHome;
  if (href.includes("/calendar")) return IconCalendar;
  if (href.includes("/patients")) return IconUsers;
  if (href.includes("/precios")) return IconTag;
  if (href.includes("/cupones")) return IconTag;
  if (href.includes("/payments")) return IconWallet;
  if (href.includes("/analytics")) return IconChart;
  if (href.includes("/resources") || href.includes("/library")) return IconBook;
  if (href.includes("/reviews")) return IconStar;
  if (href.includes("/personalizar")) return IconSliders;
  if (href.includes("/progress")) return IconProgress;
  if (href.includes("/appointments")) return IconAppointments;
  if (href.includes("/products")) return IconBox;
  if (href.includes("/cart")) return IconCart;
  if (href.includes("/notifications")) return IconBell;
  return IconHome;
}
