"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Cortina/slide al navegar entre páginas (señal clara de cambio de vista).
 */
export function RouteTransitionCurtain() {
  const pathname = usePathname();
  const first = useRef(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setActive(true);
    const t = window.setTimeout(() => setActive(false), 520);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[80] ${
        active ? "anttova-curtain-active" : "anttova-curtain-idle"
      }`}
    >
      <div className="anttova-curtain-panel anttova-curtain-panel--a" />
      <div className="anttova-curtain-panel anttova-curtain-panel--b" />
    </div>
  );
}
