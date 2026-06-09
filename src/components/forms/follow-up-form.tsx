"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitFollowUpForm } from "@/server/actions/follow-up.actions";
import {
  Field,
  FormSection,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/forms/form-primitives";

export function FollowUpFormClient({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      currentWeight: fd.get("currentWeight"),
      energyLevel: fd.get("energyLevel"),
      adherence: fd.get("adherence"),
      symptoms: fd.get("symptoms"),
      notes: fd.get("notes"),
    };

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
        description="Cuéntanos cómo te has sentido desde tu última consulta. Todos los campos son obligatorios."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Peso actual (kg)">
            <input
              name="currentWeight"
              type="number"
              required
              min={20}
              max={300}
              step={0.1}
              className={inputClass}
            />
          </Field>
          <Field label="Nivel de energía">
            <select
              name="energyLevel"
              required
              className={selectClass}
              defaultValue=""
            >
              <option value="" disabled>
                Seleccionar…
              </option>
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
          </Field>
          <Field label="¿Cómo seguiste el plan?">
            <select
              name="adherence"
              required
              className={selectClass}
              defaultValue=""
            >
              <option value="" disabled>
                Seleccionar…
              </option>
              <option value="muy_bien">Muy bien</option>
              <option value="bien">Bien</option>
              <option value="regular">Regular</option>
              <option value="mal">Mal</option>
            </select>
          </Field>
        </div>
        <Field label="Síntomas o molestias">
          <textarea
            name="symptoms"
            required
            minLength={3}
            placeholder="Ej: hinchazón, fatiga, dolor de cabeza… o escribe «ninguno»"
            className={textareaClass}
          />
        </Field>
        <Field label="Algo más que quieras comentar">
          <textarea
            name="notes"
            required
            minLength={3}
            placeholder="Cambios en rutina, viajes, estrés… o escribe «ninguno»"
            className={textareaClass}
          />
        </Field>
      </FormSection>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground transition hover:scale-[1.01] disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Enviar seguimiento"}
      </button>
    </form>
  );
}
