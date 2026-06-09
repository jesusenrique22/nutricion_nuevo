import type { BrandCharacterId } from "@/lib/brand-characters";

/** Legacy emoji ids mapped to brandbook Memoji characters */
export type BrandEmojiId =
  | "wink"
  | "heart"
  | "star"
  | "energy"
  | "balance"
  | "leaf";

export const EMOJI_TO_CHARACTER: Record<BrandEmojiId, BrandCharacterId> = {
  wink: "recipe",
  heart: "heart-hands",
  star: "motivation1",
  energy: "motivation2",
  balance: "meditation",
  leaf: "lightbulb",
};

export type BrandEmojiDef = {
  id: BrandEmojiId;
  characterId: BrandCharacterId;
  label: string;
};

export const BRAND_EMOJIS: BrandEmojiDef[] = [
  { id: "wink", characterId: "recipe", label: "Nueva receta" },
  { id: "heart", characterId: "heart-hands", label: "Love" },
  { id: "star", characterId: "motivation1", label: "Motivación" },
  { id: "energy", characterId: "motivation2", label: "Energía" },
  { id: "balance", characterId: "meditation", label: "Meditación" },
  { id: "leaf", characterId: "lightbulb", label: "Ideas" },
];

export function getEmojiById(id: BrandEmojiId): BrandEmojiDef {
  return BRAND_EMOJIS.find((e) => e.id === id) ?? BRAND_EMOJIS[0];
}

export const LOBBY_EMOJI_IDS: BrandEmojiId[] = [
  "wink",
  "heart",
  "star",
  "energy",
  "leaf",
  "balance",
];

export function getProfileEmojiIds(options: {
  hasCompletedIntake: boolean;
  appointmentCount: number;
  measurementCount: number;
}): BrandEmojiId[] {
  const ids: BrandEmojiId[] = ["wink"];

  if (options.hasCompletedIntake) ids.push("heart");
  else ids.push("star");

  if (options.appointmentCount > 0) ids.push("energy");
  if (options.measurementCount > 0) ids.push("balance");
  if (options.hasCompletedIntake && options.appointmentCount >= 2) ids.push("leaf");

  return ids.slice(0, 5);
}
