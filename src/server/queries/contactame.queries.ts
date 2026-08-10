import { cache } from "react";
import { mergeContactame } from "@/lib/contactame-parse";
import { getSiteContentBySlug } from "@/server/actions/cms.actions";
import {
  CONTACTAME_SLUG,
  DEFAULT_CONTACTAME,
  type ContactameData,
} from "@/types/contactame";

export const getContactame = cache(async (): Promise<ContactameData> => {
  try {
    const row = await getSiteContentBySlug(CONTACTAME_SLUG);
    return mergeContactame(
      row?.data as Record<string, unknown> | null | undefined,
    );
  } catch (error) {
    console.error("[cms] getContactame falló; usando defaults", error);
    return DEFAULT_CONTACTAME;
  }
});
