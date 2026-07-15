export type LobbySectionId = "inicio" | "paquetes" | "contacto";

const LOBBY_SECTIONS: LobbySectionId[] = ["inicio", "paquetes", "contacto"];

function scrollElementIntoView(el: Element) {
  const headerOffset = 88;
  const top =
    el.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });
}

/**
 * Contáctame siempre va al pie con redes/WhatsApp, aunque se agreguen
 * bloques al lobby. Reintenta por si el layout aún se está midiendo.
 */
export function scrollToLobbySection(id: LobbySectionId) {
  const run = () => {
    if (id === "contacto") {
      const footer =
        document.getElementById("contacto") ??
        document.querySelector("footer#contacto, footer[data-lobby-contact]");
      if (footer) {
        scrollElementIntoView(footer);
        return;
      }
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    const el = document.getElementById(id);
    if (!el) return;
    scrollElementIntoView(el);
  };

  run();
  requestAnimationFrame(() => {
    run();
    window.setTimeout(run, 120);
    window.setTimeout(run, 360);
  });
}

export function isLobbySectionId(value: string): value is LobbySectionId {
  return LOBBY_SECTIONS.includes(value as LobbySectionId);
}
