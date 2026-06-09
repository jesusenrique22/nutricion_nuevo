"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DynamicFieldBlock } from "@/components/forms/dynamic-field-renderer";
import {
  FormSection,
  inputClass,
} from "@/components/forms/form-primitives";
import {
  FormWizardNav,
  FormWizardProgress,
} from "@/components/forms/form-wizard-shell";
import { validateFormStep } from "@/lib/form-step-validation";
import { submitDynamicConsultationForm } from "@/server/actions/form-submission.actions";
import type { FormFieldDefinition } from "@/types/form-template";

function extractPayload(
  form: HTMLFormElement,
  fields: FormFieldDefinition[],
): Record<string, unknown> {
  const fd = new FormData(form);
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === "checkbox-group") {
      payload[field.name] = fd.getAll(field.name).map(String);
      continue;
    }
    if (field.type === "checkbox") {
      payload[field.name] = fd.get(field.name) === "true";
      continue;
    }
    const raw = fd.get(field.name);
    if (field.type === "number") {
      payload[field.name] =
        raw === null || raw === "" ? undefined : Number(raw);
      continue;
    }
    payload[field.name] = raw === null ? "" : String(raw);
  }

  return payload;
}

export function DynamicConsultationForm({
  templateCode,
  appointmentId,
  fields,
  patientEmail,
  appointmentLabel,
  title,
  description,
  submitLabel = "Enviar formulario",
}: {
  templateCode: string;
  appointmentId: string;
  fields: FormFieldDefinition[];
  patientEmail?: string;
  appointmentLabel?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalSteps = useMemo(() => {
    const max = fields.reduce((m, f) => Math.max(m, f.step ?? 1), 1);
    return max;
  }, [fields]);

  const stepFields = useMemo(
    () => fields.filter((f) => (f.step ?? 1) === step),
    [fields, step],
  );

  const isMultiStep = totalSteps > 1;

  function applyDefaults(payload: Record<string, unknown>) {
    if (
      appointmentLabel &&
      payload.reservedSlotNote !== undefined &&
      !String(payload.reservedSlotNote ?? "").trim()
    ) {
      payload.reservedSlotNote = appointmentLabel;
    }
    return payload;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const payload = applyDefaults(extractPayload(e.currentTarget, fields));

    startTransition(async () => {
      const res = await submitDynamicConsultationForm(
        templateCode,
        appointmentId,
        payload,
      );
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push("/dashboard/patient/appointments");
      router.refresh();
    });
  }

  function nextStep() {
    if (!validateFormStep(formRef.current, step)) return;
    setError(null);
    setStep((s) => Math.min(s + 1, totalSteps));
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {isMultiStep && (
        <FormWizardProgress step={step} total={totalSteps} />
      )}

      <div data-step={step}>
        <FormSection
          title={title ?? "Formulario"}
          description={
            description ??
            (isMultiStep
              ? `Paso ${step} de ${totalSteps}. Todos los campos marcados son obligatorios.`
              : "Todos los campos son obligatorios.")
          }
        >
          {step === 1 && patientEmail && (
            <div>
              <label className="text-sm font-semibold">Email</label>
              <input
                type="email"
                value={patientEmail}
                readOnly
                className={`${inputClass} bg-muted`}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {stepFields.map((field) => {
              const f =
                field.name === "reservedSlotNote" && appointmentLabel
                  ? {
                      ...field,
                      placeholder: appointmentLabel,
                    }
                  : field;
              return <DynamicFieldBlock key={f.id} field={f} />;
            })}
          </div>
        </FormSection>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {isMultiStep ? (
        <FormWizardNav
          step={step}
          total={totalSteps}
          onBack={prevStep}
          onNext={nextStep}
          isPending={isPending}
        />
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="mt-6 w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Enviando…" : submitLabel}
        </button>
      )}
    </form>
  );
}
