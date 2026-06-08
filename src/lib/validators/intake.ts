import { z } from "zod";

export const intakeProfileSchema = z.object({
  birthDate: z.string().min(1, "Fecha de nacimiento requerida"),
  gender: z.enum(["femenino", "masculino", "otro", "prefiero_no_decir"]),
  height: z.coerce.number().min(50).max(250),
  occupation: z.string().optional(),
  emergencyPhone: z.string().min(6, "Teléfono de emergencia requerido"),
});

export const intakeFormSchema = z.object({
  profile: intakeProfileSchema,
  medicalHistory: z.object({
    conditions: z.string(),
    surgeries: z.string(),
    medications: z.string(),
    familyHistory: z.string(),
  }),
  allergies: z.object({
    food: z.string(),
    drug: z.string(),
    other: z.string(),
  }),
  dietaryHabits: z.object({
    mealsPerDay: z.coerce.number().min(1).max(10),
    waterLiters: z.coerce.number().min(0).max(10),
    skipsBreakfast: z.boolean(),
    eatingOutFrequency: z.enum([
      "nunca",
      "rara_vez",
      "1-2_semana",
      "3+_semana",
    ]),
    notes: z.string(),
  }),
  physicalActivity: z.object({
    frequency: z.enum([
      "sedentario",
      "1-2_dias",
      "3-4_dias",
      "5+_dias",
    ]),
    type: z.string(),
    hoursPerWeek: z.coerce.number().min(0).max(40),
    sedentaryHours: z.coerce.number().min(0).max(24),
  }),
  goals: z.string().min(10, "Describe tus objetivos (mín. 10 caracteres)"),
  supplementsUse: z.object({
    items: z.string(),
    notes: z.string(),
  }),
});

export type IntakeFormInput = z.infer<typeof intakeFormSchema>;
