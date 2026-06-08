import { z } from "zod";

export const followUpSchema = z.object({
  currentWeight: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? undefined : Number(val),
    z.number().min(20).max(300).optional(),
  ),
  energyLevel: z.enum(["baja", "normal", "alta"]),
  adherence: z.enum(["muy_bien", "bien", "regular", "mal"]),
  symptoms: z.string(),
  notes: z.string(),
});

export type FollowUpInput = z.infer<typeof followUpSchema>;
