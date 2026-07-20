import { SOCIAL_LINKS } from "@/lib/brand-links";

export const CONTACTAME_SLUG = "contactame";

/** Tipos con ícono o semántica conocida en el footer. */
export type ContactameLinkKind =
  | "tiktok"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "whatsapp"
  | "email"
  | "phone"
  | "location"
  | "custom";

export type ContactameLink = {
  id: string;
  label: string;
  /** URL completa: https://..., wa.me/..., mailto:, tel:, maps, etc. */
  href: string;
  enabled: boolean;
  kind: ContactameLinkKind;
  /** Abrir en nueva pestaña (redes / maps). mailto/tel suelen ir en false. */
  external: boolean;
};

export type ContactameData = {
  /** Título de la sección del footer. */
  sectionTitle: string;
  /** Línea bajo los botones. */
  footerLine: string;
  links: ContactameLink[];
};

function fromSocial(
  id: string,
  kind: ContactameLinkKind,
  label: string,
  href: string,
  enabled = true,
): ContactameLink {
  return { id, label, href, enabled, kind, external: true };
}

export const DEFAULT_CONTACTAME: ContactameData = {
  sectionTitle: "Contáctame · Síguenos",
  footerLine:
    "Nutrición · Fitness · Wellness · Buenos Aires, Argentina · Est. 2025",
  links: [
    ...SOCIAL_LINKS.map((l) =>
      fromSocial(
        l.id,
        l.id as ContactameLinkKind,
        l.label,
        l.href,
        true,
      ),
    ),
    {
      id: "email",
      label: "Email",
      href: "mailto:ma.lanzahuerta@gmail.com",
      enabled: true,
      kind: "email",
      external: false,
    },
    {
      id: "location",
      label: "Ubicación",
      href: "https://maps.google.com/?q=Buenos+Aires,+Argentina",
      enabled: false,
      kind: "location",
      external: true,
    },
  ],
};
