"use client";

import { motion } from "framer-motion";

/** Fondo sutil del panel — sin personajes ni imágenes repetidas. */
export function BackgroundCharacters() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <motion.div
        className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-accent-soft/12 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl"
        animate={{ x: [0, 15, 0], y: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
