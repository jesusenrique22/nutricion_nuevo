"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DynamicFieldBlock } from "@/components/forms/dynamic-field-renderer";
import { FormStepIntro } from "@/components/forms/form-step-intro";
import { FormStepShell } from "@/components/forms/form-step-shell";
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

function fieldSpansFull(field: FormFieldDefinition) {
  return (
    field.colSpan === 2 ||
    field.type === "textarea" ||
    field.type === "radio" ||
    field.type === "checkbox-group" ||
    field.type === "checkbox"
  );
}

function ReservedSlotField({
  field,
  appointmentLabel,
}: {
  field: FormFieldDefinition;
  appointmentLabel: string;
}) {
  return (
    <div className="sm:col-span-2">
      <input type="hidden" name={field.name} value={appointmentLabel} />
      <div className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">
          {field.label}
        </p>
        <p className="mt-1 text-base font-semibold capitalize text-primary">
          {appointmentLabel}
        </p>
      </div>
    </div>
  );
}

function StepFieldsGrid({
  stepFields,
  appointmentLabel,
  hasTextareas,
}: {
  stepFields: FormFieldDefinition[];
  appointmentLabel?: string;
  hasTextareas: boolean;
}) {
  return (
    <div
      className={`grid gap-5 sm:grid-cols-2 ${hasTextareas ? "sm:gap-6" : "sm:gap-x-6 sm:gap-y-5"}`}
    >
      {stepFields.map((field) => {
        if (field.name === "reservedSlotNote" && appointmentLabel) {
          return (
            <ReservedSlotField
              key={field.id}
              field={field}
              appointmentLabel={appointmentLabel}
            />
          );
        }

        const f =
          field.name === "reservedSlotNote" && appointmentLabel
            ? { ...field, placeholder: appointmentLabel }
            : field;

        return (
          <DynamicFieldBlock
            key={f.id}
            field={f}
            className={fieldSpansFull(f) ? "sm:col-span-2" : undefined}
          />
        );
      })}
    </div>
  );
}

function isWelcomeStepFor(
  stepNum: number,
  fields: FormFieldDefinition[],
) {
  return (
    stepNum === 1 &&
    fields.filter((f) => (f.step ?? 1) === 1).length === 0
  );
}

export function DynamicConsultationForm({
  templateCode,
  appointmentId,
  fields,
  patientEmail,
  appointmentLabel,
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
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalSteps = useMemo(() => {
    const max = fields.reduce((m, f) => Math.max(m, f.step ?? 1), 1);
    return max;
  }, [fields]);

  const stepNumbers = useMemo(
    () => Array.from({ length: totalSteps }, (_, i) => i + 1),
    [totalSteps],
  );

  const isMultiStep = totalSteps > 1;
  const activeIsWelcome = isWelcomeStepFor(step, fields);

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

  function validateAllSteps(): number | null {
    for (let s = 1; s <= totalSteps; s++) {
      if (!validateFormStep(formRef.current, s)) return s;
    }
    return null;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const invalidStep = validateAllSteps();
    if (invalidStep !== null) {
      setStep(invalidStep);
      return;
    }

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
    const next = Math.min(step + 1, totalSteps);
    setMaxReachedStep((m) => Math.max(m, next));
    setStep(next);
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  function goToStep(target: number) {
    if (target < 1 || target > totalSteps || target > maxReachedStep) return;
    if (target === step) return;
    setError(null);
    setStep(target);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex h-full min-h-0 flex-col"
    >
      {isMultiStep && (
        <div className="shrink-0">
          <FormWizardProgress step={step} total={totalSteps} />
        </div>
      )}

      <div
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 ${
          activeIsWelcome ? "flex items-center" : ""
        }`}
      >
        {isMultiStep ? (
          stepNumbers.map((stepNum) => {
            const stepFields = fields.filter(
              (f) => (f.step ?? 1) === stepNum,
            );
            const isWelcome = isWelcomeStepFor(stepNum, fields);
            const isActive = stepNum === step;
            const hasTextareas = stepFields.some(
              (f) => f.type === "textarea",
            );

            return (
              <div
                key={stepNum}
                data-step={stepNum}
                hidden={!isActive}
                className={isActive ? "w-full py-2" : undefined}
              >
                {isWelcome ? (
                  <FormStepIntro
                    patientEmail={patientEmail}
                    appointmentLabel={appointmentLabel}
                    totalSteps={totalSteps}
                    currentStep={stepNum}
                    maxReachedStep={maxReachedStep}
                    fields={fields}
                    templateCode={templateCode}
                    onStepSelect={goToStep}
                  />
                ) : (
                  <FormStepShell
                    step={stepNum}
                    totalSteps={totalSteps}
                    maxReachedStep={maxReachedStep}
                    fields={fields}
                    templateCode={templateCode}
                    onStepSelect={goToStep}
                  >
                    <StepFieldsGrid
                      stepFields={stepFields}
                      appointmentLabel={appointmentLabel}
                      hasTextareas={hasTextareas}
                    />
                  </FormStepShell>
                )}
              </div>
            );
          })
        ) : (
          <div data-step={1} className="w-full py-2">
            <StepFieldsGrid
              stepFields={fields}
              appointmentLabel={appointmentLabel}
              hasTextareas={fields.some((f) => f.type === "textarea")}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 shrink-0 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 shrink-0 border-t border-foreground/5 pt-4">
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
            className="w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Enviando…" : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
