import { z } from "zod";

export const followUpSchema = z.object({
  currentWeight: z.coerce
    .number({ message: "Peso actual requerido" })
    .min(20, "Peso inválido")
    .max(300, "Peso inválido"),
  energyLevel: z.enum(["baja", "normal", "alta"]),
  adherence: z.enum(["muy_bien", "bien", "regular", "mal"]),
  symptoms: z.string().trim().min(3, "Describe síntomas o escribe «ninguno»"),
  notes: z
    .string()
    .trim()
    .min(3, "Añade un comentario o escribe «ninguno»"),
});

export type FollowUpInput = z.infer<typeof followUpSchema>;
