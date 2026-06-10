import type { FormFieldDefinition } from "@/types/form-template";
import { FormStepRoadmap } from "@/components/forms/form-step-roadmap";
import { inputClass } from "@/components/forms/form-primitives";

export function FormStepIntro({
  patientEmail,
  appointmentLabel,
  totalSteps,
  currentStep,
  maxReachedStep,
  fields,
  templateCode,
  onStepSelect,
}: {
  patientEmail?: string;
  appointmentLabel?: string;
  totalSteps: number;
  currentStep: number;
  maxReachedStep?: number;
  fields: FormFieldDefinition[];
  templateCode?: string;
  onStepSelect?: (step: number) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-8">
      <div className="lg:sticky lg:top-0 lg:flex lg:flex-col lg:justify-between lg:self-start lg:rounded-2xl lg:bg-primary/5 lg:p-6 lg:ring-1 lg:ring-primary/10 sm:p-8">
        <div>
          <p className="text-2xl font-extrabold tracking-wide text-primary">
            anttova
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/45">
            Bienestar · Salud · Fitness
          </p>
          <p className="mt-6 text-sm leading-relaxed text-foreground/70">
            Gracias por elegir Anttova. Este formulario nos ayuda a preparar tu
            consulta con información clara y confidencial.
          </p>
        </div>

        <div className="mt-8">
          <FormStepRoadmap
            totalSteps={totalSteps}
            currentStep={currentStep}
            maxReachedStep={maxReachedStep ?? currentStep}
            fields={fields}
            templateCode={templateCode}
            onStepSelect={onStepSelect}
          />
        </div>
      </div>

      <div className="flex flex-col justify-center gap-5">
        {appointmentLabel && (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/45">
              Tu turno
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-primary">
              {appointmentLabel}
            </p>
          </div>
        )}

        {patientEmail && (
          <div>
            <label className="text-sm font-semibold">Email de contacto</label>
            <input
              type="email"
              value={patientEmail}
              readOnly
              className={`${inputClass} bg-muted`}
            />
            <p className="mt-2 text-xs text-foreground/50">
              Usamos este correo para confirmaciones y seguimiento de tu
              proceso.
            </p>
          </div>
        )}

        <p className="rounded-xl border border-foreground/8 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground/65">
          La información que compartas es confidencial y solo la utiliza tu
          nutricionista para personalizar tu atención.
        </p>
      </div>
    </div>
  );
}
