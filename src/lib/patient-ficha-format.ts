const GENDER_LABELS: Record<string, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
  prefiero_no_decir: "Prefiero no decir",
};

export function formatPatientGender(value: string | null | undefined): string {
  if (!value) return "—";
  return GENDER_LABELS[value] ?? value.replace(/_/g, " ");
}

export function formatPatientHeight(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value} cm`;
}
