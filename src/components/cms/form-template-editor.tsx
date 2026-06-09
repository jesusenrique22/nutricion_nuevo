"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFormTemplate } from "@/server/actions/cms.actions";
import type { FormTemplateDTO } from "@/server/actions/cms.actions";
import type { FormFieldDefinition, FormFieldType } from "@/types/form-template";
import {
  FORM_FIELD_TYPES_WITH_OPTIONS,
  FORM_FIELD_TYPE_LABELS,
} from "@/types/form-template";

const inputClass =
  "mt-1 w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary";

function needsOptions(type: FormFieldType) {
  return FORM_FIELD_TYPES_WITH_OPTIONS.includes(type);
}

export function FormTemplateEditor({
  templates,
}: {
  templates: FormTemplateDTO[];
}) {
  const router = useRouter();
  const [active, setActive] = useState(templates[0]?.code ?? "");
  const [fields, setFields] = useState<FormFieldDefinition[]>(
    templates[0]?.fields ?? [],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const template = templates.find((t) => t.code === active);

  function selectTemplate(code: string) {
    const t = templates.find((x) => x.code === code);
    if (!t) return;
    setActive(code);
    setFields(t.fields);
    setMessage(null);
  }

  function addField() {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}`,
        name: `campo_${fields.length + 1}`,
        label: "Nueva pregunta",
        type: "text",
        required: true,
        step: 1,
      },
    ]);
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<FormFieldDefinition>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function updateOption(
    fieldId: string,
    optionIndex: number,
    patch: { value?: string; label?: string },
  ) {
    setFields(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        const options = [...(f.options ?? [])];
        options[optionIndex] = { ...options[optionIndex], ...patch };
        return { ...f, options };
      }),
    );
  }

  function addOption(fieldId: string) {
    setFields(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        const options = [...(f.options ?? [])];
        options.push({
          value: `opcion_${options.length + 1}`,
          label: "Nueva opción",
        });
        return { ...f, options };
      }),
    );
  }

  function removeOption(fieldId: string, optionIndex: number) {
    setFields(
      fields.map((f) => {
        if (f.id !== fieldId) return f;
        const options = (f.options ?? []).filter((_, i) => i !== optionIndex);
        return { ...f, options };
      }),
    );
  }

  if (!template) {
    return (
      <p className="text-sm text-foreground/50">
        No hay plantillas. Ejecuta el seed para cargar las predeterminadas.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.code}
            type="button"
            onClick={() => selectTemplate(t.code)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              active === t.code
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-foreground/50">
        Edita preguntas, tipos de campo (texto, select, radio, casillas, etc.)
        y opciones para todos los formularios, incluido el de ingreso. Los
        cambios aplican a nuevos envíos de pacientes. El{" "}
        <strong>plan semanal</strong> se edita desde la ficha de cada paciente
        en Pacientes.
      </p>

      <div className="mt-4 space-y-3">
        {fields.map((f) => (
          <div
            key={f.id}
            className="rounded-xl border border-foreground/10 bg-white p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold">Etiqueta</span>
                <input
                  value={f.label}
                  onChange={(e) =>
                    updateField(f.id, { label: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Nombre (campo)</span>
                <input
                  value={f.name}
                  onChange={(e) =>
                    updateField(f.id, { name: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Tipo de campo</span>
                <select
                  value={f.type}
                  onChange={(e) => {
                    const type = e.target.value as FormFieldType;
                    const patch: Partial<FormFieldDefinition> = { type };
                    if (needsOptions(type) && !f.options?.length) {
                      patch.options = [
                        { value: "opcion_1", label: "Opción 1" },
                        { value: "opcion_2", label: "Opción 2" },
                      ];
                    }
                    updateField(f.id, patch);
                  }}
                  className={inputClass}
                >
                  {(
                    Object.entries(FORM_FIELD_TYPE_LABELS) as [
                      FormFieldType,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Paso (página)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={f.step ?? 1}
                  onChange={(e) =>
                    updateField(f.id, {
                      step: Number(e.target.value) || 1,
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Placeholder</span>
                <input
                  value={f.placeholder ?? ""}
                  onChange={(e) =>
                    updateField(f.id, { placeholder: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Texto de ayuda</span>
                <input
                  value={f.helpText ?? ""}
                  onChange={(e) =>
                    updateField(f.id, { helpText: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              {(f.type === "text" || f.type === "textarea") && (
                <label className="block text-sm">
                  <span className="font-semibold">Mín. caracteres</span>
                  <input
                    type="number"
                    min={0}
                    value={f.minLength ?? ""}
                    onChange={(e) =>
                      updateField(f.id, {
                        minLength: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              )}
              {f.type === "number" && (
                <>
                  <label className="block text-sm">
                    <span className="font-semibold">Mínimo</span>
                    <input
                      type="number"
                      value={f.min ?? ""}
                      onChange={(e) =>
                        updateField(f.id, {
                          min: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold">Máximo</span>
                    <input
                      type="number"
                      value={f.max ?? ""}
                      onChange={(e) =>
                        updateField(f.id, {
                          max: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                </>
              )}
              <label className="block text-sm">
                <span className="font-semibold">Ancho en grilla</span>
                <select
                  value={f.colSpan ?? 1}
                  onChange={(e) =>
                    updateField(f.id, {
                      colSpan: Number(e.target.value) as 1 | 2,
                    })
                  }
                  className={inputClass}
                >
                  <option value={1}>Media columna</option>
                  <option value={2}>Ancho completo</option>
                </select>
              </label>
              <label className="flex items-end gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(f.required)}
                  onChange={(e) =>
                    updateField(f.id, { required: e.target.checked })
                  }
                />
                Obligatorio
              </label>
            </div>

            {needsOptions(f.type) && (
              <div className="mt-4 rounded-lg bg-muted/30 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">
                  Opciones
                </p>
                <div className="mt-2 space-y-2">
                  {(f.options ?? []).map((opt, i) => (
                    <div key={i} className="flex flex-wrap gap-2">
                      <input
                        value={opt.value}
                        onChange={(e) =>
                          updateOption(f.id, i, { value: e.target.value })
                        }
                        placeholder="valor"
                        className={`${inputClass} max-w-[140px]`}
                      />
                      <input
                        value={opt.label}
                        onChange={(e) =>
                          updateOption(f.id, i, { label: e.target.value })
                        }
                        placeholder="Etiqueta visible"
                        className={`${inputClass} min-w-[180px] flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(f.id, i)}
                        className="text-xs font-semibold text-red-600"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(f.id)}
                  className="mt-2 text-xs font-semibold text-primary"
                >
                  + Agregar opción
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => removeField(f.id)}
              className="mt-3 text-xs font-semibold text-red-600"
            >
              Quitar pregunta
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addField}
          className="rounded-full border px-4 py-2 text-sm font-semibold"
        >
          + Agregar pregunta
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const res = await updateFormTemplate({
                code: template.code,
                name: template.name,
                fields,
              });
              setMessage(res.ok ? "Formulario guardado." : res.message);
              if (res.ok) router.refresh();
            });
          }}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Guardar formulario
        </button>
      </div>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
