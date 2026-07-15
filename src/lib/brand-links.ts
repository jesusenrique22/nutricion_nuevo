export type SocialIconId =
  | "tiktok"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "whatsapp";

export type BrandLinkItem = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  subtitle?: string;
};

export const BRAND_TAGLINE =
  "Te ayudo a construir una vida más saludable y en balance.";

export const SOCIAL_LINKS: BrandLinkItem[] = [
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://tiktok.com/@anttova",
    external: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://instagram.com/anttova",
    external: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://linkedin.com/company/anttova",
    external: true,
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://youtube.com/@anttova",
    external: true,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: "https://wa.me/5491100000000",
    external: true,
  },
];

export const SOCIAL_ICON_ORDER: SocialIconId[] = [
  "tiktok",
  "instagram",
  "linkedin",
  "youtube",
  "whatsapp",
];

export function getPatientAppLinks(): BrandLinkItem[] {
  return [
    {
      id: "appointments",
      label: "Agendar cita",
      href: "/dashboard/patient/appointments",
      subtitle: "Nutrición, entrenamiento o antropometría",
    },
    {
      id: "library",
      label: "Recursos",
      href: "/dashboard/patient/library",
      subtitle: "Material digital desbloqueado",
    },
    {
      id: "cart",
      label: "Carrito",
      href: "/dashboard/patient/cart",
      subtitle: "Pedido e historial de compras",
    },
  ];
}
