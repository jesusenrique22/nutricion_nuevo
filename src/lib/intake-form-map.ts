import type { IntakeFormInput } from "@/lib/validators/intake";

/** Campos planos del template `intake` mapeados al esquema anidado legacy. */
export const INTAKE_KNOWN_FIELDS = new Set([
  "birthDate",
  "gender",
  "height",
  "occupation",
  "emergencyPhone",
  "conditions",
  "surgeries",
  "medications",
  "familyHistory",
  "allergyFood",
  "allergyDrug",
  "allergyOther",
  "mealsPerDay",
  "waterLiters",
  "skipsBreakfast",
  "eatingOutFrequency",
  "dietNotes",
  "activityFrequency",
  "activityType",
  "hoursPerWeek",
  "sedentaryHours",
  "goals",
  "supplements",
  "supplementsNotes",
]);

export function mapFlatPayloadToIntake(
  data: Record<string, unknown>,
): IntakeFormInput {
  return {
    profile: {
      birthDate: String(data.birthDate ?? ""),
      gender: data.gender as IntakeFormInput["profile"]["gender"],
      height: Number(data.height),
      occupation: String(data.occupation ?? ""),
      emergencyPhone: String(data.emergencyPhone ?? ""),
    },
    medicalHistory: {
      conditions: String(data.conditions ?? ""),
      surgeries: String(data.surgeries ?? ""),
      medications: String(data.medications ?? ""),
      familyHistory: String(data.familyHistory ?? ""),
    },
    allergies: {
      food: String(data.allergyFood ?? ""),
      drug: String(data.allergyDrug ?? ""),
      other: String(data.allergyOther ?? ""),
    },
    dietaryHabits: {
      mealsPerDay: Number(data.mealsPerDay),
      waterLiters: Number(data.waterLiters),
      skipsBreakfast: data.skipsBreakfast === true,
      eatingOutFrequency:
        data.eatingOutFrequency as IntakeFormInput["dietaryHabits"]["eatingOutFrequency"],
      notes: String(data.dietNotes ?? ""),
    },
    physicalActivity: {
      frequency:
        data.activityFrequency as IntakeFormInput["physicalActivity"]["frequency"],
      type: String(data.activityType ?? ""),
      hoursPerWeek: Number(data.hoursPerWeek),
      sedentaryHours: Number(data.sedentaryHours),
    },
    goals: String(data.goals ?? ""),
    supplementsUse: {
      items: String(data.supplements ?? ""),
      notes: String(data.supplementsNotes ?? ""),
    },
  };
}

export function intakeExtendedPayload(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!INTAKE_KNOWN_FIELDS.has(key)) extra[key] = value;
  }
  return extra;
}
