"use client";

import { motion } from "framer-motion";

export function LandingAmbientMotion() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <motion.div
        className="absolute -left-32 top-[15%] h-80 w-80 rounded-full bg-accent-soft/25 blur-3xl"
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-24 top-[45%] h-96 w-96 rounded-full bg-accent/20 blur-3xl"
        animate={{
          x: [0, -35, 0],
          y: [0, 25, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[10%] left-[30%] h-64 w-64 rounded-full bg-primary/8 blur-3xl"
        animate={{
          x: [0, 25, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
