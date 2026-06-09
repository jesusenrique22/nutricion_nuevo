import { z } from "zod";
import type { FormFieldDefinition } from "@/types/form-template";

function optionValues(field: FormFieldDefinition): [string, ...string[]] {
  const values = (field.options ?? []).map((o) => o.value).filter(Boolean);
  if (values.length === 0) {
    return ["__missing_options__"];
  }
  return values as [string, ...string[]];
}

function buildFieldSchema(field: FormFieldDefinition): z.ZodTypeAny {
  const label = field.label;
  const requiredMsg = `${label} requerido`;

  switch (field.type) {
    case "checkbox":
      return field.required
        ? z.literal(true, { message: requiredMsg })
        : z.boolean().optional();

    case "checkbox-group": {
      const values = optionValues(field);
      const base = z.array(z.enum(values));
      return field.required
        ? base.min(1, `Selecciona al menos una opción en «${label}»`)
        : base.optional();
    }

    case "number": {
      let schema = z.coerce.number({ message: requiredMsg });
      if (field.min != null) schema = schema.min(field.min);
      if (field.max != null) schema = schema.max(field.max);
      return field.required ? schema : schema.optional();
    }

    case "select":
    case "radio": {
      const values = optionValues(field);
      const schema = z.enum(values, { message: requiredMsg });
      return field.required ? schema : schema.optional();
    }

    case "email":
    case "tel":
    case "date":
    case "time":
    case "url":
    case "text":
    case "textarea": {
      let schema = z.string().trim();
      if (field.required) {
        schema = schema.min(1, requiredMsg);
      }
      if (field.minLength != null && field.required) {
        schema = schema.min(
          field.minLength,
          `${label} (mín. ${field.minLength} caracteres)`,
        );
      }
      if (field.type === "email") {
        return field.required
          ? schema.email("Email inválido")
          : schema.optional();
      }
      if (field.type === "url") {
        return field.required
          ? schema.url("URL inválida")
          : schema.optional();
      }
      return field.required ? schema : schema.optional();
    }

    default:
      return z.unknown();
  }
}

export function buildDynamicFormSchema(fields: FormFieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = buildFieldSchema(field);
  }
  return z.object(shape);
}

export function validateDynamicFormPayload(
  fields: FormFieldDefinition[],
  payload: unknown,
) {
  return buildDynamicFormSchema(fields).safeParse(payload);
}
