"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Fondo animado del lobby: gradiente mesh + orbes en movimiento lento.
 */
export function LandingAmbientMotion() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Base gradient animado */}
      <motion.div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgb(242 181 204 / 0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 30%, rgb(232 180 200 / 0.28), transparent 50%), radial-gradient(ellipse 60% 45% at 50% 95%, rgb(116 30 49 / 0.08), transparent 55%), linear-gradient(180deg, #f2f0ed 0%, #f8f2f4 45%, #f2f0ed 100%)",
        }}
        animate={
          reduced
            ? undefined
            : {
                backgroundPosition: ["0% 0%", "100% 50%", "0% 0%"],
              }
        }
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />

      {/* Grain sutil */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Orbes */}
      {[
        {
          className:
            "absolute -left-32 top-[12%] h-[22rem] w-[22rem] rounded-full bg-accent-soft/30 blur-3xl",
          animate: { x: [0, 48, 0], y: [0, -36, 0], scale: [1, 1.1, 1] },
          duration: 16,
        },
        {
          className:
            "absolute -right-28 top-[38%] h-[26rem] w-[26rem] rounded-full bg-accent/25 blur-3xl",
          animate: { x: [0, -42, 0], y: [0, 32, 0], scale: [1, 1.14, 1] },
          duration: 20,
        },
        {
          className:
            "absolute bottom-[8%] left-[25%] h-72 w-72 rounded-full bg-primary/10 blur-3xl",
          animate: { x: [0, 30, 0], y: [0, -24, 0] },
          duration: 14,
        },
        {
          className:
            "absolute right-[15%] top-[62%] h-56 w-56 rounded-full bg-muted/50 blur-3xl",
          animate: { x: [0, -20, 0], y: [0, 18, 0], scale: [1, 1.08, 1] },
          duration: 18,
        },
        {
          className:
            "absolute left-[55%] top-[5%] h-40 w-40 rounded-full bg-accent-soft/20 blur-2xl",
          animate: { x: [0, 15, 0], y: [0, 12, 0] },
          duration: 11,
        },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className={orb.className}
          animate={reduced ? undefined : orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
