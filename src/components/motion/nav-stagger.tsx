"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

export const navStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.06 },
  },
};

export const navStaggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export const navStaggerItemFromLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export function NavStaggerList({
  children,
  className = "",
  animateKey,
}: {
  children: React.ReactNode;
  className?: string;
  /** Cambiá la key al abrir un menú móvil para repetir la animación. */
  animateKey?: string | number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      key={animateKey}
      className={className}
      variants={navStaggerContainer}
      initial={reduced ? false : "hidden"}
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function NavStaggerItem({
  children,
  className = "",
  fromLeft = false,
}: {
  children: React.ReactNode;
  className?: string;
  fromLeft?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={fromLeft ? navStaggerItemFromLeft : navStaggerItem}
    >
      {children}
    </motion.div>
  );
}
