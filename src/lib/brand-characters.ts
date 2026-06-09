export type BrandCharacterId =
  | "recipe"
  | "hugs"
  | "medicine"
  | "motivation1"
  | "motivation2"
  | "meditation"
  | "party"
  | "worker"
  | "thumbsup"
  | "heart-hands"
  | "lightbulb";

export type BrandCharacter = {
  id: BrandCharacterId;
  src: string;
  label: string;
};

export const BRAND_CHARACTERS: BrandCharacter[] = [
  { id: "recipe", src: "/brand/characters/recipe.png", label: "Nueva receta" },
  { id: "hugs", src: "/brand/characters/hugs.png", label: "Abrazos" },
  { id: "medicine", src: "/brand/characters/medicine.png", label: "Licenciada" },
  { id: "motivation1", src: "/brand/characters/motivation1.png", label: "Motivación" },
  { id: "motivation2", src: "/brand/characters/motivation2.png", label: "Energía" },
  { id: "meditation", src: "/brand/characters/meditation.png", label: "Meditación" },
  { id: "party", src: "/brand/characters/party.png", label: "Celebrar" },
  { id: "worker", src: "/brand/characters/worker.png", label: "Trabajo" },
  { id: "thumbsup", src: "/brand/characters/thumbsup.png", label: "Good luck" },
  { id: "heart-hands", src: "/brand/characters/heart-hands.png", label: "Love" },
  { id: "lightbulb", src: "/brand/characters/lightbulb.png", label: "Ideas" },
];

export const BACKGROUND_CHARACTER_IDS: BrandCharacterId[] = [
  "recipe",
  "meditation",
  "motivation1",
  "medicine",
  "party",
  "worker",
];

export function getCharacter(id: BrandCharacterId): BrandCharacter {
  return BRAND_CHARACTERS.find((c) => c.id === id) ?? BRAND_CHARACTERS[0];
}

export function getProfileCharacterIds(options: {
  hasCompletedIntake: boolean;
  appointmentCount: number;
}): BrandCharacterId[] {
  const ids: BrandCharacterId[] = ["medicine"];
  if (options.hasCompletedIntake) ids.push("recipe");
  else ids.push("motivation1");
  if (options.appointmentCount > 0) ids.push("thumbsup");
  if (options.appointmentCount >= 2) ids.push("heart-hands");
  return ids.slice(0, 4);
}
