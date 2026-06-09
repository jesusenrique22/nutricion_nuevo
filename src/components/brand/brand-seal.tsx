"use client";

import { motion } from "framer-motion";

export function BrandSeal() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="mt-12 flex flex-col items-center text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-foreground/10 bg-white/60 shadow-sm">
        <svg viewBox="0 0 80 80" className="h-14 w-14" aria-hidden>
          <circle cx="40" cy="40" r="36" fill="none" stroke="#741E31" strokeWidth="1.5" />
          <path
            d="M22 32c8-6 28-6 36 0M22 48c8 6 28 6 36 0"
            stroke="#741E31"
            strokeWidth="1.2"
            fill="none"
          />
          <text
            x="40"
            y="28"
            textAnchor="middle"
            fill="#741E31"
            fontSize="7"
            fontWeight="700"
            letterSpacing="1"
          >
            ANTTOVA
          </text>
        </svg>
      </div>
      <p className="mt-4 max-w-xs text-[0.65rem] leading-relaxed text-foreground/45">
        Nutrición · Fitness · Wellness · Buenos Aires
      </p>
    </motion.div>
  );
}
