import { cache } from "react";
import { mergeAuthBranding } from "@/lib/auth-branding-parse";
import { getSiteContentBySlug } from "@/server/actions/cms.actions";
import {
  AUTH_BRANDING_SLUG,
  type AuthBrandingData,
} from "@/types/auth-branding";

export const getAuthBranding = cache(async (): Promise<AuthBrandingData> => {
  const row = await getSiteContentBySlug(AUTH_BRANDING_SLUG);
  return mergeAuthBranding(
    row?.data as Record<string, unknown> | null | undefined,
  );
});
