"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Transición suave al cambiar de ruta (lobby → recursos → productos, etc.).
 * Mismo árbol DOM siempre (evita React #418 con prefers-reduced-motion).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="flex min-h-full flex-1 flex-col"
        initial={reduced ? false : { opacity: 0, y: 14, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={reduced ? undefined : { opacity: 0, y: -10, filter: "blur(3px)" }}
        transition={
          reduced ? { duration: 0 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
