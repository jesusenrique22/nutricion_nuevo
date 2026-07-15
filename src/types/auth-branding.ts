import { BRAND_PROFILE } from "@/lib/brand-assets";

export const AUTH_BRANDING_SLUG = "auth_branding";

export interface AuthBrandingData {
  /** Foto circular del login / registro. */
  photoUrl: string;
  /** Nombre debajo de la foto. */
  name: string;
  /** Línea secundaria (título / especialidad). */
  role: string;
}

export const DEFAULT_AUTH_BRANDING: AuthBrandingData = {
  photoUrl: BRAND_PROFILE.professional,
  name: "Lic. María Antonieta Lanza",
  role: "Nutrición · Fitness · Wellness",
};
