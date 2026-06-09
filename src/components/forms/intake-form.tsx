"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitIntakeForm } from "@/server/actions/intake.actions";
import {
  Field,
  FormSection,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/forms/form-primitives";

export function IntakeFormClient({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      profile: {
        birthDate: fd.get("birthDate"),
        gender: fd.get("gender"),
        height: fd.get("height"),
        occupation: fd.get("occupation"),
        emergencyPhone: fd.get("emergencyPhone"),
      },
      medicalHistory: {
        conditions: fd.get("conditions"),
        surgeries: fd.get("surgeries"),
        medications: fd.get("medications"),
        familyHistory: fd.get("familyHistory"),
      },
      allergies: {
        food: fd.get("allergyFood"),
        drug: fd.get("allergyDrug"),
        other: fd.get("allergyOther"),
      },
      dietaryHabits: {
        mealsPerDay: fd.get("mealsPerDay"),
        waterLiters: fd.get("waterLiters"),
        skipsBreakfast: fd.get("skipsBreakfast") === "on",
        eatingOutFrequency: fd.get("eatingOutFrequency"),
        notes: fd.get("dietNotes"),
      },
      physicalActivity: {
        frequency: fd.get("activityFrequency"),
        type: fd.get("activityType"),
        hoursPerWeek: fd.get("hoursPerWeek"),
        sedentaryHours: fd.get("sedentaryHours"),
      },
      goals: fd.get("goals"),
      supplementsUse: {
        items: fd.get("supplements"),
        notes: fd.get("supplementsNotes"),
      },
    };

    startTransition(async () => {
      const res = await submitIntakeForm(appointmentId, payload);
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
        title="Datos personales"
        description="Información básica para tu expediente clínico."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de nacimiento">
            <input name="birthDate" type="date" required className={inputClass} />
          </Field>
          <Field label="Género">
            <select name="gender" required className={selectClass}>
              <option value="">Seleccionar…</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </Field>
          <Field label="Estatura (cm)">
            <input
              name="height"
              type="number"
              min={50}
              max={250}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Ocupación">
            <input name="occupation" type="text" required minLength={2} className={inputClass} />
          </Field>
          <Field label="Teléfono de emergencia">
            <input
              name="emergencyPhone"
              type="tel"
              required
              className={inputClass}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Historial médico"
        description="Patologías, cirugías, medicamentos y antecedentes familiares."
      >
        <Field label="Enfermedades o condiciones actuales">
          <textarea
            name="conditions"
            required
            minLength={2}
            placeholder="Ej: hipotiroidismo, diabetes… (escribe 'ninguna' si aplica)"
            className={textareaClass}
          />
        </Field>
        <Field label="Cirugías previas">
          <textarea name="surgeries" required minLength={2} className={textareaClass} />
        </Field>
        <Field label="Medicamentos actuales">
          <textarea name="medications" required minLength={2} className={textareaClass} />
        </Field>
        <Field label="Antecedentes familiares relevantes">
          <textarea name="familyHistory" required minLength={2} className={textareaClass} />
        </Field>
      </FormSection>

      <FormSection title="Alergias e intolerancias">
        <Field label="Alimentarias">
          <textarea name="allergyFood" required minLength={2} className={textareaClass} />
        </Field>
        <Field label="Medicamentos">
          <textarea name="allergyDrug" required minLength={2} className={textareaClass} />
        </Field>
        <Field label="Otras">
          <textarea name="allergyOther" required minLength={2} className={textareaClass} />
        </Field>
      </FormSection>

      <FormSection title="Hábitos alimenticios">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Comidas al día">
            <input
              name="mealsPerDay"
              type="number"
              min={1}
              max={10}
              defaultValue={3}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Agua (litros/día)">
            <input
              name="waterLiters"
              type="number"
              min={0}
              max={10}
              step={0.5}
              defaultValue={2}
              required
              className={inputClass}
            />
          </Field>
          <Field label="¿Frecuencia comes fuera?">
            <select name="eatingOutFrequency" required className={selectClass}>
              <option value="nunca">Nunca</option>
              <option value="rara_vez">Rara vez</option>
              <option value="1-2_semana">1–2 veces por semana</option>
              <option value="3+_semana">3+ veces por semana</option>
            </select>
          </Field>
          <Field label="¿Saltas el desayuno?">
            <label className="mt-2 flex items-center gap-2">
              <input name="skipsBreakfast" type="checkbox" />
              <span className="text-sm">Sí, con frecuencia</span>
            </label>
          </Field>
        </div>
        <Field label="Notas adicionales sobre alimentación">
          <textarea name="dietNotes" required minLength={2} className={textareaClass} />
        </Field>
      </FormSection>

      <FormSection title="Actividad física">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frecuencia semanal">
            <select name="activityFrequency" required className={selectClass}>
              <option value="sedentario">Sedentario</option>
              <option value="1-2_dias">1–2 días</option>
              <option value="3-4_dias">3–4 días</option>
              <option value="5+_dias">5+ días</option>
            </select>
          </Field>
          <Field label="Tipo de actividad">
            <input
              name="activityType"
              required
              minLength={2}
              placeholder="Ej: caminata, gym, yoga…"
              className={inputClass}
            />
          </Field>
          <Field label="Horas activas / semana">
            <input
              name="hoursPerWeek"
              type="number"
              min={0}
              max={40}
              defaultValue={0}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Horas sedentarias / día">
            <input
              name="sedentaryHours"
              type="number"
              min={0}
              max={24}
              defaultValue={8}
              required
              className={inputClass}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Objetivos y suplementos">
        <Field label="¿Cuáles son tus objetivos?">
          <textarea
            name="goals"
            required
            minLength={10}
            placeholder="Ej: bajar grasa, mejorar energía, rendimiento deportivo…"
            className={textareaClass}
          />
        </Field>
        <Field label="Suplementos que consumes">
          <textarea
            name="supplements"
            required
            minLength={2}
            placeholder="Ej: proteína, multivitamínico… o «ninguno»"
            className={textareaClass}
          />
        </Field>
        <Field label="Notas sobre suplementos">
          <textarea name="supplementsNotes" required minLength={2} className={textareaClass} />
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
        {isPending ? "Guardando…" : "Enviar formulario de ingreso"}
      </button>
    </form>
  );
}
