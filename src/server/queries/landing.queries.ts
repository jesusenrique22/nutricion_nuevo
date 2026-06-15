import { cache } from "react";
import { mergeLandingImages } from "@/lib/landing-images-parse";
import { getSiteContentBySlug } from "@/server/actions/cms.actions";
import type { LandingImagesData } from "@/types/landing-images";
import { LANDING_IMAGES_SLUG } from "@/types/landing-images";

export const getLandingImages = cache(async (): Promise<LandingImagesData> => {
  const row = await getSiteContentBySlug(LANDING_IMAGES_SLUG);
  return mergeLandingImages(row?.data);
});
