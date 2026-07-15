import {
  AUTH_BRANDING_SLUG,
  DEFAULT_AUTH_BRANDING,
  type AuthBrandingData,
} from "@/types/auth-branding";

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function mergeAuthBranding(
  stored: Record<string, unknown> | null | undefined,
): AuthBrandingData {
  if (!stored) return DEFAULT_AUTH_BRANDING;
  return {
    photoUrl: str(stored.photoUrl, DEFAULT_AUTH_BRANDING.photoUrl),
    name: str(stored.name, DEFAULT_AUTH_BRANDING.name),
    role: str(stored.role, DEFAULT_AUTH_BRANDING.role),
  };
}

export function authBrandingToRecord(
  data: AuthBrandingData,
): Record<string, unknown> {
  return {
    photoUrl: data.photoUrl,
    name: data.name,
    role: data.role,
  };
}

export { AUTH_BRANDING_SLUG };
