"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  getCharacter,
  type BrandCharacterId,
} from "@/lib/brand-characters";

const sizeMap = { sm: 56, md: 80, lg: 110, xl: 140 } as const;

export function BrandCharacter({
  id,
  size = "md",
  className = "",
  delay = 0,
  subtle = false,
}: {
  id: BrandCharacterId;
  size?: keyof typeof sizeMap;
  className?: string;
  delay?: number;
  subtle?: boolean;
}) {
  const character = getCharacter(id);
  const px = sizeMap[size];

  return (
    <motion.div
      className={`relative shrink-0 ${className}`}
      style={{ width: px, height: px }}
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: subtle ? 0 : [0, -5, 0] }}
      transition={{
        opacity: { duration: 0.4, delay },
        scale: { type: "spring", stiffness: 400, damping: 20, delay },
        y: subtle
          ? undefined
          : {
              duration: 3.5 + delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: delay + 0.3,
            },
      }}
      title={character.label}
    >
      <Image
        src={character.src}
        alt={character.label}
        width={px}
        height={px}
        style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%" }}
        className="object-contain drop-shadow-md"
      />
    </motion.div>
  );
}
