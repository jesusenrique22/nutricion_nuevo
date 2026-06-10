export interface ChatSticker {
  id: string;
  label: string;
  src: string;
}

/** Stickers del brandbook (public/brand/stickers). */
export const CHAT_STICKERS: ChatSticker[] = [
  { id: "love", label: "Love", src: "/brand/stickers/love.svg" },
  { id: "abrazo", label: "Abrazo", src: "/brand/stickers/abrazo.svg" },
  { id: "fiesta", label: "Fiesta", src: "/brand/stickers/fiesta.svg" },
  { id: "gracias", label: "Gracias", src: "/brand/stickers/gracias.svg" },
  { id: "idea", label: "Idea", src: "/brand/stickers/idea.svg" },
  { id: "genial", label: "Genial", src: "/brand/stickers/genial.svg" },
  { id: "muy-bien", label: "Muy bien", src: "/brand/stickers/muy-bien.svg" },
  { id: "espectacular", label: "Espectacular", src: "/brand/stickers/espectacular.svg" },
  { id: "delicioso", label: "Delicioso", src: "/brand/stickers/delicioso.svg" },
  { id: "jajajajaja", label: "Jajaja", src: "/brand/stickers/jajajajaja.svg" },
  { id: "meditacion", label: "Meditación", src: "/brand/stickers/meditacion.svg" },
  { id: "trabajando", label: "Trabajando", src: "/brand/stickers/trabajando.svg" },
  { id: "llamame-doc", label: "Llámame", src: "/brand/stickers/llamame-doc.svg" },
  { id: "8", label: "Ok", src: "/brand/stickers/8.svg" },
];

export function getChatSticker(id: string): ChatSticker | undefined {
  return CHAT_STICKERS.find((s) => s.id === id);
}
