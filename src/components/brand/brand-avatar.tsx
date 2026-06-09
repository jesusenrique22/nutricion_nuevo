"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function BrandAvatar({
  size = 88,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full bg-accent-soft/60 blur-md"
        aria-hidden
      />
      <Image
        src="/brand/avatar-mark.svg"
        alt="Anttova"
        width={size}
        height={size}
        className="relative rounded-full ring-4 ring-white/80 shadow-lg"
        priority
      />
    </motion.div>
  );
}
