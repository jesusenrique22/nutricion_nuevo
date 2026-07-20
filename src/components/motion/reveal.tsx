"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type Direction = "up" | "down" | "left" | "right" | "fade";

const offset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 32 },
  down: { x: 0, y: -32 },
  left: { x: -40, y: 0 },
  right: { x: 40, y: 0 },
  fade: { x: 0, y: 0 },
};

const ease = [0.22, 1, 0.36, 1] as const;

/** Repite la animación cada vez que el bloque entra al viewport (subir o bajar). */
const viewportRepeat = { once: false as const, amount: 0.15 };

/**
 * Siempre el mismo árbol DOM (motion.div) en server y client.
 * No ramificar con useReducedMotion en el render: causa React #418.
 */
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { x, y } = offset[direction];

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={viewportRepeat}
      transition={
        reduced ? { duration: 0 } : { duration: 0.65, delay, ease }
      }
    >
      {children}
    </motion.div>
  );
}

export function RevealScale({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={viewportRepeat}
      transition={
        reduced ? { duration: 0 } : { duration: 0.6, delay, ease }
      }
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease },
  },
};

const staggerContainerReduced: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

const staggerItemReduced: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

/** Contenedor que revela hijos con stagger al entrar en viewport (lobby). */
export function StaggerReveal({
  children,
  className = "",
  role,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  role?: string;
  "aria-label"?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      role={role}
      aria-label={ariaLabel}
      variants={reduced ? staggerContainerReduced : staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={viewportRepeat}
    >
      {children}
    </motion.div>
  );
}

export function StaggerRevealItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={reduced ? staggerItemReduced : staggerItem}
    >
      {children}
    </motion.div>
  );
}
