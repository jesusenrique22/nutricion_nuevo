import { z } from "zod";

const requiredText = (label: string, min = 2) =>
  z.string().trim().min(min, `${label} requerido`);

export const anthropometryFormSchema = z.object({
  consentAccepted: z.literal(true, {
    message: "Debes aceptar el consentimiento para continuar.",
  }),
  fullName: requiredText("Nombre completo"),
  consultationReason: requiredText("Motivo de consulta", 5),
  phone: z.string().trim().min(6, "Teléfono requerido"),
  gender: z.enum(["femenino", "masculino", "otro"]),
  birthDate: z.string().min(1, "Fecha de nacimiento requerida"),
  previousAnthropometry: z.enum(["si", "no"]),
  dominantHand: z.enum(["diestro", "zurdo", "ambidiestro"]),
  dominantFoot: z.enum(["diestro", "zurdo", "ambidiestro"]),
  activityLevel: z.enum([
    "sedentario",
    "principiante",
    "intermedio",
    "avanzado",
  ]),
  activityFrequency: z.enum(["menos_3", "3_a_5", "mas_5"]),
  sportsPracticed: requiredText("Deporte practicado"),
  reportAnalysisTypes: z
    .array(
      z.enum([
        "seguimiento_personal",
        "referencia_nacional",
        "seguimiento_deporte",
      ]),
    )
    .min(1, "Selecciona al menos un tipo de análisis"),
  mainObjective: z.enum([
    "rendimiento_deportivo",
    "composicion_corporal",
    "salud_general",
    "competencia",
    "otro",
  ]),
  evaluationFrequency: z.enum([
    "cada_mes",
    "cada_2_3_meses",
    "cuando_necesite",
    "no_se",
  ]),
  reservedSlotNote: requiredText("Turno reservado"),
  procedureQuestions: requiredText("Dudas o inquietudes", 5),
});

export type AnthropometryFormInput = z.infer<typeof anthropometryFormSchema>;
