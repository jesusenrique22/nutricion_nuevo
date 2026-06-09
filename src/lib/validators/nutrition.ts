import { z } from "zod";

const requiredText = (label: string, min = 2) =>
  z.string().trim().min(min, `${label} requerido`);

const activityLevel = z.enum([
  "sedentario",
  "principiante",
  "intermedio",
  "avanzado",
]);

const activityFrequency = z.enum(["menos_3", "3_a_5", "mas_5"]);

export const nutritionFormSchema = z.object({
  fullName: requiredText("Nombre completo"),
  phone: z.string().trim().min(6, "Teléfono requerido"),
  gender: z.enum(["femenino", "masculino", "otro"]),
  birthDate: z.string().min(1, "Fecha de nacimiento requerida"),
  consultationReason: requiredText("Motivo de consulta", 5),
  dietDescription: requiredText("Descripción de alimentación", 5),
  dietaryRestrictions: requiredText("Restricciones alimentarias", 3),
  activityLevel,
  activityFrequency,
  sportsPracticed: requiredText("Deporte practicado"),
  reservedSlotNote: requiredText("Turno reservado"),
  continuationPreference: z.enum([
    "turnos_individuales",
    "packs",
    "conversar_en_consulta",
  ]),
});

export type NutritionFormInput = z.infer<typeof nutritionFormSchema>;
