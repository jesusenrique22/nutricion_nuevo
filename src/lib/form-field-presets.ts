import type { FormFieldOption } from "@/types/form-template";

export const GENDER_OPTIONS: FormFieldOption[] = [
  { value: "femenino", label: "Femenino" },
  { value: "masculino", label: "Masculino" },
  { value: "otro", label: "Otro / Prefiero no decirlo" },
];

export const YES_NO_OPTIONS: FormFieldOption[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

export const DOMINANCE_OPTIONS: FormFieldOption[] = [
  { value: "diestro", label: "Diestro" },
  { value: "zurdo", label: "Zurdo" },
  { value: "ambidiestro", label: "Ambidiestro" },
];

export const ACTIVITY_LEVEL_OPTIONS: FormFieldOption[] = [
  {
    value: "sedentario",
    label: "Sedentario (poco o ningún esfuerzo físico)",
  },
  {
    value: "principiante",
    label: "Principiante (empezaste a entrenar, sin rutina establecida)",
  },
  {
    value: "intermedio",
    label: "Intermedio (entrenas regularmente)",
  },
  {
    value: "avanzado",
    label: "Avanzado (rutina de entrenamiento consistente)",
  },
];

export const ACTIVITY_FREQUENCY_OPTIONS: FormFieldOption[] = [
  { value: "menos_3", label: "Menos de 3 veces a la semana" },
  { value: "3_a_5", label: "De 3 a 5 veces a la semana" },
  { value: "mas_5", label: "Más de 5 veces a la semana" },
];

export const ANALYSIS_TYPE_OPTIONS: FormFieldOption[] = [
  {
    value: "seguimiento_personal",
    label: "Seguimiento personal (comparación con mis propias mediciones)",
  },
  {
    value: "referencia_nacional",
    label:
      "Referencia nacional (comparación con promedios de la población argentina)",
  },
  {
    value: "seguimiento_deporte",
    label:
      "Seguimiento personal + demandas de mi deporte (índices de rendimiento) — costo extra",
  },
];

export const MAIN_OBJECTIVE_OPTIONS: FormFieldOption[] = [
  { value: "rendimiento_deportivo", label: "Rendimiento deportivo" },
  { value: "composicion_corporal", label: "Composición corporal" },
  { value: "salud_general", label: "Salud general" },
  { value: "competencia", label: "Preparación para competencia" },
  { value: "otro", label: "Otro" },
];

export const EVALUATION_FREQUENCY_OPTIONS: FormFieldOption[] = [
  { value: "cada_mes", label: "Cada mes" },
  { value: "cada_2_3_meses", label: "Cada 2–3 meses" },
  { value: "cuando_necesite", label: "Cuando lo necesite" },
  { value: "no_se", label: "No lo sé / conversarlo en consulta" },
];

export const CONTINUATION_OPTIONS: FormFieldOption[] = [
  {
    value: "turnos_individuales",
    label:
      "Turnos individuales: consultas de seguimiento según necesidad, con ajustes progresivos.",
  },
  {
    value: "packs",
    label:
      "Packs de consultas: acompañamiento más continuo, con beneficios como antropometrías y material educativo.",
  },
  {
    value: "conversar_en_consulta",
    label: "Aún no lo sé / prefiero conversarlo en consulta.",
  },
];

export const ENERGY_LEVEL_OPTIONS: FormFieldOption[] = [
  { value: "baja", label: "Baja" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
];

export const ADHERENCE_OPTIONS: FormFieldOption[] = [
  { value: "muy_bien", label: "Muy bien" },
  { value: "bien", label: "Bien" },
  { value: "regular", label: "Regular" },
  { value: "mal", label: "Mal" },
];
