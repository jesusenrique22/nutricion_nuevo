"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitNutritionForm } from "@/server/actions/nutrition.actions";
import { validateFormStep } from "@/lib/form-step-validation";
import { Field, FormSection, inputClass, textareaClass } from "@/components/forms/form-primitives";
import {
  ActivityFields,
  AppointmentClosingFields,
  ConsultationReasonField,
  PersonalDataFields,
} from "@/components/forms/shared-consultation-fields";
import {
  FormWizardNav,
  FormWizardProgress,
} from "@/components/forms/form-wizard-shell";

const TOTAL_STEPS = 4;

export function NutritionFormClient({
  appointmentId,
  patientEmail,
  appointmentLabel,
}: {
  appointmentId: string;
  patientEmail: string;
  appointmentLabel: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      fullName: fd.get("fullName"),
      phone: fd.get("phone"),
      gender: fd.get("gender"),
      birthDate: fd.get("birthDate"),
      consultationReason: fd.get("consultationReason"),
      dietDescription: fd.get("dietDescription"),
      dietaryRestrictions: fd.get("dietaryRestrictions"),
      activityLevel: fd.get("activityLevel"),
      activityFrequency: fd.get("activityFrequency"),
      sportsPracticed: fd.get("sportsPracticed"),
      reservedSlotNote: fd.get("reservedSlotNote") || appointmentLabel,
      continuationPreference: fd.get("continuationPreference"),
    };

    startTransition(async () => {
      const res = await submitNutritionForm(appointmentId, payload);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push("/dashboard/patient/appointments");
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <FormWizardProgress step={step} total={TOTAL_STEPS} />

      {step === 1 && (
        <div data-step="1">
        <FormSection
          title="Primera consulta nutricional"
          description="Gracias por elegir Anttova. Completá este formulario para optimizar tu primera consulta."
        >
          <div className="rounded-xl bg-primary/5 p-4 text-center">
            <p className="text-2xl font-extrabold tracking-wide text-primary">
              anttova
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-foreground/50">
              Bienestar · Salud · Fitness
            </p>
          </div>
          <Field label="Email">
            <input
              type="email"
              value={patientEmail}
              readOnly
              className={`${inputClass} bg-muted`}
            />
          </Field>
          <p className="text-sm text-foreground/70">
            La información que compartas será tratada con confidencialidad y nos
            ayudará a preparar tu consulta nutricional.
          </p>
        </FormSection>
        </div>
      )}

      {step === 2 && (
        <div data-step="2">
        <FormSection title="Datos personales">
          <PersonalDataFields />
        </FormSection>
        </div>
      )}

      {step === 3 && (
        <div data-step="3">
        <FormSection title="Alimentación y actividad">
          <ConsultationReasonField placeholder="Ej: mejorar hábitos, bajar grasa, aumentar masa muscular, rendimiento deportivo, salud hormonal…" />
          <Field label="¿Cómo describirías tu alimentación hoy?">
            <textarea
              name="dietDescription"
              required
              minLength={5}
              placeholder="Ej: ordenada, desordenada, muy variable, restrictiva…"
              className={textareaClass}
            />
          </Field>
          <Field label="¿Tienes alguna restricción, intolerancia o preferencia alimentaria importante?">
            <textarea
              name="dietaryRestrictions"
              required
              minLength={3}
              placeholder="Tu respuesta"
              className={textareaClass}
            />
          </Field>
          <ActivityFields />
        </FormSection>
        </div>
      )}

      {step === 4 && (
        <div data-step="4">
        <FormSection title="Turno y modalidad">
          <AppointmentClosingFields appointmentLabel={appointmentLabel} />
        </FormSection>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <FormWizardNav
        step={step}
        total={TOTAL_STEPS}
        onBack={() => {
          setError(null);
          setStep((s) => Math.max(s - 1, 1));
        }}
        onNext={() => {
          if (step > 1 && !validateFormStep(formRef.current, step)) return;
          setError(null);
          setStep((s) => Math.min(s + 1, TOTAL_STEPS));
        }}
        isPending={isPending}
      />
    </form>
  );
}
