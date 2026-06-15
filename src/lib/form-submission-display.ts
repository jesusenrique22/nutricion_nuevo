import type { FormFieldDefinition } from "@/types/form-template";

const META_KEYS = new Set([
  "id",
  "appointmentId",
  "patientProfileId",
  "createdAt",
  "updatedAt",
  "extendedPayload",
]);

/** Une columnas del modelo con campos CMS extra. */
export function flattenSubmissionRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (META_KEYS.has(key)) continue;
    if (value !== null && value !== undefined && value !== "") {
      result[key] = value;
    }
  }

  const extended = record.extendedPayload;
  if (extended && typeof extended === "object" && !Array.isArray(extended)) {
    for (const [key, value] of Object.entries(
      extended as Record<string, unknown>,
    )) {
      if (value !== null && value !== undefined && value !== "") {
        result[key] = value;
      }
    }
  }

  return result;
}

/** Convierte la anamnesis anidada en pares planos para mostrar. */
export function flattenIntakeForm(record: {
  medicalHistory: unknown;
  allergies: unknown;
  dietaryHabits: unknown;
  physicalActivity: unknown;
  goals: string | null;
  supplementsUse: unknown;
  extendedPayload: unknown;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const merge = (obj: unknown) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== null && value !== undefined && value !== "") {
        result[key] = value;
      }
    }
  };

  merge(record.medicalHistory);
  merge(record.allergies);
  merge(record.dietaryHabits);
  merge(record.physicalActivity);
  merge(record.supplementsUse);
  if (record.goals) result.goals = record.goals;
  merge(record.extendedPayload);

  return result;
}

export function buildFieldLabelMap(
  fields: FormFieldDefinition[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of fields) {
    map.set(field.name, field.label);
  }
  return map;
}

function optionLabel(
  field: FormFieldDefinition | undefined,
  value: string,
): string {
  const option = field?.options?.find((o) => o.value === value);
  return option?.label ?? value.replace(/_/g, " ");
}

export function formatFormDisplayValue(
  value: unknown,
  field?: FormFieldDefinition,
): string {
  if (value === null || value === undefined || value === "") return "—";

  if (value instanceof Date) {
    return value.toLocaleDateString("es", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  if (typeof value === "boolean") return value ? "Sí" : "No";

  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((item) =>
        typeof item === "string" ? optionLabel(field, item) : String(item),
      )
      .join(", ");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${humanizeKey(k)}: ${formatFormDisplayValue(v)}`)
      .join(" · ");
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("es", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      }
    }
    if (field?.options?.length) {
      return optionLabel(field, value);
    }
    return value.replace(/_/g, " ");
  }

  return String(value);
}

export function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export type FormDisplayRow = {
  key: string;
  label: string;
  value: string;
};

/** Ordena filas según plantilla CMS; campos extra al final. */
export function buildFormDisplayRows(
  data: Record<string, unknown>,
  fields: FormFieldDefinition[],
): FormDisplayRow[] {
  const labelMap = buildFieldLabelMap(fields);
  const used = new Set<string>();
  const rows: FormDisplayRow[] = [];

  for (const field of fields) {
    if (!(field.name in data)) continue;
    used.add(field.name);
    rows.push({
      key: field.name,
      label: field.label,
      value: formatFormDisplayValue(data[field.name], field),
    });
  }

  for (const [key, value] of Object.entries(data)) {
    if (used.has(key)) continue;
    rows.push({
      key,
      label: labelMap.get(key) ?? humanizeKey(key),
      value: formatFormDisplayValue(value),
    });
  }

  return rows;
}
