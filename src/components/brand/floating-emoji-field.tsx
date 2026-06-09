"use client";

import { BrandEmoji } from "@/components/brand/brand-emoji";
import { LOBBY_EMOJI_IDS, type BrandEmojiId } from "@/lib/brand-emojis";

const positions: Array<{
  id: BrandEmojiId;
  className: string;
  size: "sm" | "md" | "lg";
  delay: number;
}> = [
  {
    id: LOBBY_EMOJI_IDS[0],
    className: "left-[4%] top-[8%] hidden sm:block",
    size: "lg",
    delay: 0,
  },
  {
    id: LOBBY_EMOJI_IDS[1],
    className: "right-[6%] top-[12%]",
    size: "md",
    delay: 0.15,
  },
  {
    id: LOBBY_EMOJI_IDS[2],
    className: "left-[8%] bottom-[18%] hidden md:block",
    size: "md",
    delay: 0.3,
  },
  {
    id: LOBBY_EMOJI_IDS[3],
    className: "right-[10%] bottom-[22%] hidden sm:block",
    size: "lg",
    delay: 0.2,
  },
  {
    id: LOBBY_EMOJI_IDS[4],
    className: "left-[42%] top-[2%] hidden lg:block",
    size: "sm",
    delay: 0.45,
  },
  {
    id: LOBBY_EMOJI_IDS[5],
    className: "right-[38%] bottom-[6%] hidden lg:block",
    size: "sm",
    delay: 0.55,
  },
];

export function FloatingEmojiField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {positions.map((item) => (
        <div key={item.id} className={`absolute ${item.className}`}>
          <BrandEmoji id={item.id} size={item.size} delay={item.delay} />
        </div>
      ))}
    </div>
  );
}
