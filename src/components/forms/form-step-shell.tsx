import { FormStepRoadmap } from "@/components/forms/form-step-roadmap";
import {
  stepDescription,
  stepFieldCount,
  stepLabel,
} from "@/components/forms/form-step-utils";
import type { FormFieldDefinition } from "@/types/form-template";

export function FormStepShell({
  step,
  totalSteps,
  maxReachedStep,
  fields,
  templateCode,
  onStepSelect,
  children,
}: {
  step: number;
  totalSteps: number;
  maxReachedStep: number;
  fields: FormFieldDefinition[];
  templateCode?: string;
  onStepSelect?: (step: number) => void;
  children: React.ReactNode;
}) {
  const title = stepLabel(step, fields, templateCode);
  const description = stepDescription(step, fields, templateCode);
  const fieldCount = stepFieldCount(step, fields);
  const hasTextareas = fields
    .filter((f) => (f.step ?? 1) === step)
    .some((f) => f.type === "textarea");
  const isCompactStep = fieldCount <= 4 && !hasTextareas;

  return (
    <div className="w-full py-1">
      <div className="sticky top-0 z-10 -mx-1 mb-5 bg-white/95 px-1 pb-3 pt-1 backdrop-blur-sm lg:hidden">
        <FormStepRoadmap
          totalSteps={totalSteps}
          currentStep={step}
          maxReachedStep={maxReachedStep}
          fields={fields}
          templateCode={templateCode}
          compact
          onStepSelect={onStepSelect}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(200px,1fr)_1.65fr] lg:items-start lg:gap-8">
        <div className="hidden lg:sticky lg:top-0 lg:col-span-1 lg:flex lg:max-h-[min(70vh,520px)] lg:flex-col lg:self-start lg:overflow-y-auto lg:rounded-2xl lg:bg-primary/5 lg:p-6 lg:ring-1 lg:ring-primary/10">
          <div className="shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/45">
              Tu progreso
            </p>
            <p className="mt-2 text-lg font-bold text-primary">{title}</p>
          </div>
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <FormStepRoadmap
              totalSteps={totalSteps}
              currentStep={step}
              maxReachedStep={maxReachedStep}
              fields={fields}
              templateCode={templateCode}
              onStepSelect={onStepSelect}
            />
          </div>
        </div>

        <div
          className={`flex min-w-0 flex-col gap-5 ${isCompactStep ? "lg:justify-center" : ""}`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">
              Paso {step} de {totalSteps}
            </p>
            <h3 className="mt-1 text-xl font-bold text-primary">{title}</h3>
            {description && (
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-foreground/65">
                {description}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-foreground/8 bg-muted/25 p-5 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
