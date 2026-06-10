import type { FormFieldDefinition } from "@/types/form-template";

const STEP_HINTS: Record<string, Record<number, string>> = {
  nutrition: {
    1: "Bienvenida",
    2: "Datos personales",
    3: "Alimentación y objetivos",
    4: "Actividad y seguimiento",
  },
  anthropometry: {
    1: "Consentimiento",
    2: "Datos personales",
    3: "Actividad física",
    4: "Objetivos del informe",
    5: "Turno y consultas",
  },
  training: {
    1: "Consentimiento",
    2: "Datos personales",
    3: "Entrenamiento y deportes",
    4: "Objetivos del plan",
    5: "Turno y limitaciones",
  },
  intake: {
    1: "Datos generales",
    2: "Historial clínico",
    3: "Alergias e intolerancias",
    4: "Hábitos y objetivos",
  },
  follow_up: {
    1: "Seguimiento general",
    2: "Alimentación y adherencia",
    3: "Actividad y bienestar",
  },
};

const STEP_DESCRIPTIONS: Record<string, Record<number, string>> = {
  nutrition: {
    2: "Completá tus datos de contacto para armar tu ficha y mantenernos en comunicación.",
    3: "Contanos cómo comes hoy, qué buscás y si tenés restricciones a tener en cuenta.",
    4: "Tu actividad física y preferencias nos ayudan a personalizar el plan de seguimiento.",
  },
  anthropometry: {
    1: "Leé y aceptá el consentimiento para continuar con la evaluación antropométrica.",
    2: "Datos básicos para identificarte y preparar tu evaluación.",
    3: "Información sobre tu actividad física y deportes que practicás.",
    4: "Elegí el tipo de análisis y objetivos que querés en tu informe.",
    5: "Confirmá tu turno y compartí cualquier duda sobre el procedimiento.",
  },
  training: {
    1: "Confirmá que la información es verídica y autorizá su uso para tu plan.",
    2: "Datos personales y motivo de consulta para diseñar tu entrenamiento.",
    3: "Tu nivel de actividad, frecuencia y deportes que practicás.",
    4: "Objetivos del plan y frecuencia de seguimiento deseada.",
    5: "Confirmá tu turno e informá lesiones o limitaciones relevantes.",
  },
  intake: {
    1: "Datos generales para iniciar tu historial clínico en Anttova.",
    2: "Antecedentes de salud, cirugías y medicación actual.",
    3: "Alergias e intolerancias alimentarias o a medicamentos.",
    4: "Hábitos diarios, objetivos y cualquier información adicional.",
  },
  follow_up: {
    1: "Cómo te sentís desde la última consulta y cambios recientes.",
    2: "Adherencia al plan y cómo viene tu alimentación.",
    3: "Actividad física, descanso y bienestar general.",
  },
};

export function stepLabel(
  step: number,
  fields: FormFieldDefinition[],
  templateCode?: string,
) {
  const hint = templateCode && STEP_HINTS[templateCode]?.[step];
  if (hint) return hint;

  const onStep = fields.filter((f) => (f.step ?? 1) === step);
  if (onStep.length === 0 && step === 1) return "Bienvenida";
  if (onStep.length === 1) return onStep[0]!.label.slice(0, 48);
  return `Paso ${step}`;
}

export function stepDescription(
  step: number,
  fields: FormFieldDefinition[],
  templateCode?: string,
) {
  const desc = templateCode && STEP_DESCRIPTIONS[templateCode]?.[step];
  if (desc) return desc;

  const onStep = fields.filter((f) => (f.step ?? 1) === step);
  if (onStep.length === 0) return undefined;
  if (onStep.every((f) => f.type === "textarea")) {
    return "Respondé con el mayor detalle posible; no hay respuestas correctas o incorrectas.";
  }
  if (onStep.length <= 2) {
    return "Completá los campos requeridos para continuar.";
  }
  return "Todos los campos marcados con * son obligatorios.";
}

export function stepFieldCount(step: number, fields: FormFieldDefinition[]) {
  return fields.filter((f) => (f.step ?? 1) === step).length;
}
