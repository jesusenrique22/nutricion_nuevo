export type LobbySectionId = "inicio" | "paquetes" | "contacto";

const LOBBY_SECTIONS: LobbySectionId[] = ["inicio", "paquetes", "contacto"];

export function scrollToLobbySection(id: LobbySectionId) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function isLobbySectionId(value: string): value is LobbySectionId {
  return LOBBY_SECTIONS.includes(value as LobbySectionId);
}
