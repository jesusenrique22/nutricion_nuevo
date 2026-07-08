import { z } from "zod";

export const patientAdminResourceSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2048, "Enlace demasiado largo")
    .refine(
      (v) => v === "" || /^https?:\/\/.+/i.test(v),
      "Ingresá una URL válida (http:// o https://)",
    ),
  note: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export type PatientAdminResourceInput = z.infer<
  typeof patientAdminResourceSchema
>;
