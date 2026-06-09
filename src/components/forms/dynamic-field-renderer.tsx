"use client";

import type { FormFieldDefinition } from "@/types/form-template";
import {
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/forms/form-primitives";

export function DynamicFieldRenderer({ field }: { field: FormFieldDefinition }) {
  const common = {
    name: field.name,
    required: field.required,
    placeholder: field.placeholder,
    minLength: field.minLength,
    min: field.min,
    max: field.max,
  };

  if (field.type === "textarea") {
    return <textarea {...common} className={textareaClass} />;
  }

  if (field.type === "select" && field.options) {
    return (
      <select {...common} className={selectClass} defaultValue="">
        <option value="" disabled>
          Seleccionar…
        </option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "radio" && field.options) {
    return (
      <div className="mt-2 space-y-2">
        {field.options.map((o) => (
          <label
            key={o.value}
            className="flex items-start gap-3 rounded-xl border border-foreground/15 p-3"
          >
            <input
              type="radio"
              name={field.name}
              value={o.value}
              required={field.required}
              className="mt-1"
            />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox-group" && field.options) {
    return (
      <div
        className="mt-2 space-y-2"
        data-checkbox-group={field.name}
        data-group-required={field.required ? "true" : undefined}
      >
        {field.options.map((o) => (
          <label
            key={o.value}
            className="flex items-start gap-3 rounded-xl border border-foreground/15 p-3"
          >
            <input
              type="checkbox"
              name={field.name}
              value={o.value}
              className="mt-1"
            />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 rounded-xl border border-foreground/15 p-4">
        <input
          type="checkbox"
          name={field.name}
          value="true"
          required={field.required}
          className="mt-1"
        />
        <span className="text-sm">
          {field.label}
          {field.required && <span className="text-red-600"> *</span>}
        </span>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <input type="number" step="0.1" {...common} className={inputClass} />
    );
  }

  const inputType =
    field.type === "email"
      ? "email"
      : field.type === "tel"
        ? "tel"
        : field.type === "date"
          ? "date"
          : field.type === "time"
            ? "time"
            : field.type === "url"
              ? "url"
              : "text";

  return <input type={inputType} {...common} className={inputClass} />;
}

export function DynamicFieldBlock({ field }: { field: FormFieldDefinition }) {
  if (field.type === "checkbox") {
    return (
      <div className={field.colSpan === 2 ? "sm:col-span-2" : undefined}>
        {field.helpText && (
          <p className="mb-2 text-sm text-foreground/65">{field.helpText}</p>
        )}
        <DynamicFieldRenderer field={field} />
      </div>
    );
  }

  return (
    <Field
      label={field.label}
      className={field.colSpan === 2 ? "sm:col-span-2" : undefined}
    >
      {field.helpText && (
        <p className="mb-2 text-xs text-foreground/55">{field.helpText}</p>
      )}
      <DynamicFieldRenderer field={field} />
    </Field>
  );
}
