"use client";

import { motion } from "framer-motion";

type Direction = "up" | "down" | "left" | "right" | "fade";

const offset: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: -36, y: 0 },
  right: { x: 36, y: 0 },
  fade: { x: 0, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
  float = false,
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
  float?: boolean;
}) {
  const { x, y } = offset[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: false, amount: 0.2, margin: "-40px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      animate={
        float
          ? {
              y: [0, -6, 0],
              transition: {
                y: {
                  duration: 4.5 + delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: delay + 0.5,
                },
              },
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}

export function RevealScale({
  children,
  delay = 0,
  pulse = false,
}: {
  children: React.ReactNode;
  delay?: number;
  pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false, amount: 0.2, margin: "-40px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      animate={
        pulse
          ? {
              scale: [1, 1.015, 1],
              transition: {
                scale: {
                  duration: 5 + delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              },
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
