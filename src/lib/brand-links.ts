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

export function getPatientAppLinks(options: {
  pendingForms: number;
  upcomingAppointments: number;
}): BrandLinkItem[] {
  return [
    {
      id: "appointments",
      label: "Agendar cita",
      href: "/dashboard/patient/appointments",
      subtitle: "Nutrición, entrenamiento o antropometría",
    },
    {
      id: "forms",
      label:
        options.pendingForms > 0
          ? `Formularios (${options.pendingForms})`
          : "Mis formularios",
      href: "/dashboard/patient/appointments/form",
      subtitle: "Completa tu ingreso o seguimiento",
    },
    {
      id: "progress",
      label: "Mi progreso",
      href: "/dashboard/patient/progress",
      subtitle: "Mediciones y evolución",
    },
    {
      id: "library",
      label: "Mi librería",
      href: "/dashboard/patient/library",
      subtitle: "E-books y videos",
    },
    {
      id: "chat",
      label: "Chat con Anttova",
      href: "/dashboard/chat",
      subtitle: "Consultas en tiempo real",
    },
  ];
}
