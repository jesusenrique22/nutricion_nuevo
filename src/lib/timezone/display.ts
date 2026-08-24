import { CLINIC_TIMEZONE } from "@/lib/clinic-timezone";

export const BOOKING_TIMEZONE_STORAGE_KEY = "booking-viewer-timezone";

/** Solo se escribe cuando el usuario elige manualmente en el selector. */
export const BOOKING_TIMEZONE_MANUAL_KEY = "booking-viewer-timezone-manual";

export type TimezoneOption = { value: string; label: string };

export type TimezoneOptionGroup = {
  region: string;
  options: TimezoneOption[];
};

/**
 * Zonas para el selector manual. La detección automática cubre cualquier país
 * aunque no esté en esta lista (se agrega al selector como "detectada").
 */
export const VIEWER_TIMEZONE_GROUPS: TimezoneOptionGroup[] = [
  {
    region: "Argentina",
    options: [
      {
        value: "America/Argentina/Buenos_Aires",
        label: "Buenos Aires (CABA, La Plata, Mar del Plata)",
      },
      { value: "America/Argentina/Cordoba", label: "Córdoba" },
      { value: "America/Argentina/Mendoza", label: "Mendoza" },
      { value: "America/Argentina/Salta", label: "Salta / Jujuy / Tucumán" },
      { value: "America/Argentina/Tucuman", label: "Tucumán (alternativa)" },
      { value: "America/Argentina/Ushuaia", label: "Ushuaia / Tierra del Fuego" },
    ],
  },
  {
    region: "Cono Sur",
    options: [
      { value: "America/Montevideo", label: "Uruguay" },
      { value: "America/Santiago", label: "Chile (continental)" },
      { value: "America/Punta_Arenas", label: "Chile (Magallanes)" },
      { value: "America/Asuncion", label: "Paraguay" },
      { value: "America/La_Paz", label: "Bolivia" },
    ],
  },
  {
    region: "Brasil",
    options: [
      { value: "America/Sao_Paulo", label: "Brasil (São Paulo, Rio, Brasília)" },
      { value: "America/Manaus", label: "Brasil (Amazonas)" },
      { value: "America/Fortaleza", label: "Brasil (Nordeste)" },
      { value: "America/Belem", label: "Brasil (Pará)" },
      { value: "America/Cuiaba", label: "Brasil (Mato Grosso)" },
      { value: "America/Rio_Branco", label: "Brasil (Acre)" },
    ],
  },
  {
    region: "Andina y Caribe",
    options: [
      { value: "America/Bogota", label: "Colombia" },
      { value: "America/Caracas", label: "Venezuela" },
      { value: "America/Lima", label: "Perú" },
      { value: "America/Guayaquil", label: "Ecuador" },
      { value: "America/Panama", label: "Panamá" },
      { value: "America/Costa_Rica", label: "Costa Rica" },
      { value: "America/Guatemala", label: "Guatemala" },
      { value: "America/El_Salvador", label: "El Salvador" },
      { value: "America/Tegucigalpa", label: "Honduras" },
      { value: "America/Managua", label: "Nicaragua" },
      { value: "America/Havana", label: "Cuba" },
      { value: "America/Santo_Domingo", label: "República Dominicana" },
      { value: "America/Puerto_Rico", label: "Puerto Rico" },
      { value: "America/Jamaica", label: "Jamaica" },
      { value: "America/Port_of_Spain", label: "Trinidad y Tobago" },
    ],
  },
  {
    region: "México y Centroamérica",
    options: [
      { value: "America/Mexico_City", label: "México (centro)" },
      { value: "America/Cancun", label: "México (Quintana Roo)" },
      { value: "America/Monterrey", label: "México (norte)" },
      { value: "America/Tijuana", label: "México (Baja California)" },
      { value: "America/Mazatlan", label: "México (Pacífico)" },
    ],
  },
  {
    region: "Estados Unidos y Canadá",
    options: [
      { value: "America/New_York", label: "EE.UU. / Canadá — Este (NYC, Miami, Toronto)" },
      { value: "America/Chicago", label: "EE.UU. / Canadá — Centro (Chicago, Dallas)" },
      { value: "America/Denver", label: "EE.UU. / Canadá — Montaña (Denver, Calgary)" },
      { value: "America/Los_Angeles", label: "EE.UU. / Canadá — Pacífico (LA, Vancouver)" },
      { value: "America/Phoenix", label: "EE.UU. — Arizona (sin horario de verano)" },
      { value: "America/Anchorage", label: "EE.UU. — Alaska" },
      { value: "Pacific/Honolulu", label: "EE.UU. — Hawái" },
    ],
  },
  {
    region: "Europa",
    options: [
      { value: "Europe/Madrid", label: "España" },
      { value: "Europe/Lisbon", label: "Portugal" },
      { value: "Europe/London", label: "Reino Unido / Irlanda" },
      { value: "Europe/Paris", label: "Francia" },
      { value: "Europe/Berlin", label: "Alemania" },
      { value: "Europe/Rome", label: "Italia" },
      { value: "Europe/Amsterdam", label: "Países Bajos" },
      { value: "Europe/Brussels", label: "Bélgica" },
      { value: "Europe/Zurich", label: "Suiza" },
      { value: "Europe/Vienna", label: "Austria" },
      { value: "Europe/Warsaw", label: "Polonia" },
      { value: "Europe/Athens", label: "Grecia" },
      { value: "Europe/Moscow", label: "Rusia (Moscú)" },
    ],
  },
  {
    region: "África y Oriente Medio",
    options: [
      { value: "Africa/Cairo", label: "Egipto" },
      { value: "Africa/Johannesburg", label: "Sudáfrica" },
      { value: "Africa/Lagos", label: "Nigeria" },
      { value: "Africa/Casablanca", label: "Marruecos" },
      { value: "Asia/Dubai", label: "Emiratos Árabes Unidos" },
      { value: "Asia/Jerusalem", label: "Israel" },
      { value: "Asia/Riyadh", label: "Arabia Saudita" },
      { value: "Asia/Tehran", label: "Irán" },
    ],
  },
  {
    region: "Asia y Oceanía",
    options: [
      { value: "Asia/Tokyo", label: "Japón" },
      { value: "Asia/Seoul", label: "Corea del Sur" },
      { value: "Asia/Shanghai", label: "China (Shanghai)" },
      { value: "Asia/Hong_Kong", label: "Hong Kong" },
      { value: "Asia/Singapore", label: "Singapur" },
      { value: "Asia/Kolkata", label: "India" },
      { value: "Asia/Bangkok", label: "Tailandia" },
      { value: "Asia/Jakarta", label: "Indonesia (Yakarta)" },
      { value: "Australia/Sydney", label: "Australia (Sydney)" },
      { value: "Australia/Melbourne", label: "Australia (Melbourne)" },
      { value: "Pacific/Auckland", label: "Nueva Zelanda" },
    ],
  },
];

/** Lista plana (compatibilidad). */
export const VIEWER_TIMEZONE_OPTIONS: TimezoneOption[] =
  VIEWER_TIMEZONE_GROUPS.flatMap((g) => g.options);

export function detectBrowserTimezone(): string {
  if (typeof Intl === "undefined") return CLINIC_TIMEZONE;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || CLINIC_TIMEZONE;
  } catch {
    return CLINIC_TIMEZONE;
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function formatTimeInZone(
  iso: string | Date,
  timeZone: string,
  locale = "es",
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDateTimeInZone(
  iso: string | Date,
  timeZone: string,
  locale = "es",
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(locale, {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDateInZone(
  iso: string | Date,
  timeZone: string,
  locale = "es",
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Etiqueta corta de zona (ej. GMT-3, ART). */
export function timezoneShortLabel(timeZone: string, locale = "es"): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** Nombre legible para una zona IANA (ej. "America/Caracas" → offset + nombre). */
export function timezoneDisplayLabel(timeZone: string, locale = "es"): string {
  const known = VIEWER_TIMEZONE_OPTIONS.find((o) => o.value === timeZone);
  if (known) return known.label;
  const short = timezoneShortLabel(timeZone, locale);
  return `${timeZone.replace(/_/g, " ")} (${short})`;
}

export function viewerDiffersFromClinic(viewerTz: string): boolean {
  if (viewerTz === CLINIC_TIMEZONE) return false;
  const clinic = formatTimeInZone(new Date(), CLINIC_TIMEZONE);
  const viewer = formatTimeInZone(new Date(), viewerTz);
  return clinic !== viewer;
}

export function clinicTimezoneLabel(): string {
  const opt = VIEWER_TIMEZONE_OPTIONS.find((o) => o.value === CLINIC_TIMEZONE);
  return opt?.label ?? "Argentina";
}

export function buildTimezoneSelectGroups(
  viewerTimezone: string,
  hydrated: boolean,
): TimezoneOptionGroup[] {
  const groups = VIEWER_TIMEZONE_GROUPS.map((g) => ({
    ...g,
    options: [...g.options],
  }));

  if (
    hydrated &&
    isValidTimezone(viewerTimezone) &&
    !VIEWER_TIMEZONE_OPTIONS.some((o) => o.value === viewerTimezone)
  ) {
    groups.unshift({
      region: "Detectada automáticamente",
      options: [
        {
          value: viewerTimezone,
          label: timezoneDisplayLabel(viewerTimezone),
        },
      ],
    });
  }

  return groups;
}
