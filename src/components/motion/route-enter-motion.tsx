"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Transición visible al cambiar de ruta.
 * CSS + remount por pathname (más fiable que AnimatePresence en App Router).
 */
export function RouteEnterMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const first = useRef(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setTick((t) => t + 1);
  }, [pathname]);

  return (
    <div
      key={`${pathname}-${tick}`}
      className="anttova-page-enter flex min-h-full w-full flex-1 flex-col"
    >
      {children}
    </div>
  );
}
