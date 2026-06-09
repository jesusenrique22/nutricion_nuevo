"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitFollowUpForm } from "@/server/actions/follow-up.actions";
import {
  Field,
  FormSection,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/forms/form-primitives";
import type { FormFieldDefinition } from "@/types/form-template";

export function DynamicFollowUpForm({
  appointmentId,
  fields,
}: {
  appointmentId: string;
  fields: FormFieldDefinition[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function renderField(f: FormFieldDefinition) {
    const common = {
      name: f.name,
      required: f.required,
      placeholder: f.placeholder,
      minLength: f.minLength,
      className:
        f.type === "textarea" ? textareaClass : f.type === "select" ? selectClass : inputClass,
    };

    if (f.type === "textarea") {
      return <textarea {...common} />;
    }
    if (f.type === "select" && f.options) {
      return (
        <select {...common} defaultValue="">
          <option value="" disabled>
            Seleccionar…
          </option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === "number") {
      return <input type="number" step="0.1" {...common} />;
    }
    return <input type={f.type === "tel" ? "tel" : f.type === "email" ? "email" : "text"} {...common} />;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const val = fd.get(f.name);
      if (f.type === "number" && val) {
        payload[f.name] = Number(val);
      } else {
        payload[f.name] = val;
      }
    }

    startTransition(async () => {
      const res = await submitFollowUpForm(appointmentId, payload);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push("/dashboard/patient/appointments");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection
        title="Cita de seguimiento"
        description="Cuéntanos cómo te has sentido. Todos los campos son obligatorios."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.id} label={f.label}>
              {renderField(f)}
            </Field>
          ))}
        </div>
      </FormSection>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Enviar seguimiento"}
      </button>
    </form>
  );
}
