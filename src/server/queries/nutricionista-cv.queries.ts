import { cache } from "react";
import { getSiteContentBySlug } from "@/server/actions/cms.actions";
import { parseNutricionistaPage } from "@/lib/nutricionista-cv-parse";
import { DEFAULT_NUTRICIONISTA_PAGE } from "@/lib/nutricionista-cv-defaults";
import type { NutricionistaPageData } from "@/types/nutricionista-cv";
import { NUTRICIONISTA_PAGE_SLUG } from "@/types/nutricionista-cv";

export const getNutricionistaPage = cache(async (): Promise<NutricionistaPageData> => {
  const row = await getSiteContentBySlug(NUTRICIONISTA_PAGE_SLUG);
  if (!row?.data) return DEFAULT_NUTRICIONISTA_PAGE;
  return parseNutricionistaPage(row.data);
});
