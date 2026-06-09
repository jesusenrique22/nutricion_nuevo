"use client";

import { BrandCharacter } from "@/components/brand/brand-character";
import {
  getEmojiById,
  type BrandEmojiId,
} from "@/lib/brand-emojis";

const sizeMap = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
} as const;

export function BrandEmoji({
  id,
  size = "md",
  className = "",
  animate = true,
  delay = 0,
}: {
  id: BrandEmojiId;
  size?: keyof typeof sizeMap;
  className?: string;
  animate?: boolean;
  delay?: number;
}) {
  const emoji = getEmojiById(id);

  return (
    <BrandCharacter
      id={emoji.characterId}
      size={sizeMap[size]}
      className={className}
      delay={animate ? delay : 0}
      subtle={!animate}
    />
  );
}
