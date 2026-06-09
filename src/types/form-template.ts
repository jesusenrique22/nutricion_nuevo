export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "date"
  | "time"
  | "url"
  | "number"
  | "select"
  | "radio"
  | "checkbox-group"
  | "checkbox";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  step?: number;
  placeholder?: string;
  helpText?: string;
  minLength?: number;
  min?: number;
  max?: number;
  colSpan?: 1 | 2;
  options?: FormFieldOption[];
}

export interface FormTemplateData {
  code: string;
  name: string;
  fields: FormFieldDefinition[];
}

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto corto",
  textarea: "Párrafo / texto largo",
  email: "Email",
  tel: "Teléfono",
  date: "Fecha",
  time: "Hora",
  url: "Enlace (URL)",
  number: "Número",
  select: "Lista desplegable",
  radio: "Opción única (radio)",
  "checkbox-group": "Casillas múltiples",
  checkbox: "Casilla única (sí/no)",
};

export const FORM_FIELD_TYPES_WITH_OPTIONS: FormFieldType[] = [
  "select",
  "radio",
  "checkbox-group",
];
