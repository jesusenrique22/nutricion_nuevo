import type { FormFieldDefinition } from "@/types/form-template";
import { stepLabel } from "@/components/forms/form-step-utils";

function stepItemClass(active: boolean, done: boolean, clickable: boolean) {
  if (active) {
    return "bg-primary text-primary-foreground shadow-sm";
  }
  if (done) {
    return clickable
      ? "cursor-pointer bg-white/80 text-foreground/55 hover:bg-white hover:text-primary"
      : "bg-white/80 text-foreground/55";
  }
  return "text-foreground/50";
}

export function FormStepRoadmap({
  totalSteps,
  currentStep,
  maxReachedStep = currentStep,
  fields,
  templateCode,
  compact,
  onStepSelect,
}: {
  totalSteps: number;
  currentStep: number;
  maxReachedStep?: number;
  fields: FormFieldDefinition[];
  templateCode?: string;
  compact?: boolean;
  onStepSelect?: (step: number) => void;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => {
          const active = n === currentStep;
          const done = n < currentStep;
          const clickable =
            !!onStepSelect && n <= maxReachedStep && n !== currentStep;

          const className = `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
            active
              ? "bg-primary text-primary-foreground"
              : done || n <= maxReachedStep
                ? clickable
                  ? "cursor-pointer bg-primary/10 text-primary hover:bg-primary/15"
                  : "bg-primary/10 text-primary"
                : "bg-muted text-foreground/45"
          }`;

          if (clickable) {
            return (
              <button
                key={n}
                type="button"
                onClick={() => onStepSelect(n)}
                className={className}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    active
                      ? "bg-primary-foreground text-primary"
                      : "bg-white/80 text-foreground/55"
                  }`}
                >
                  {n}
                </span>
                {stepLabel(n, fields, templateCode)}
              </button>
            );
          }

          return (
            <span key={n} className={className}>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  active
                    ? "bg-primary-foreground text-primary"
                    : "bg-white/80 text-foreground/55"
                }`}
              >
                {n}
              </span>
              {stepLabel(n, fields, templateCode)}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => {
        const active = n === currentStep;
        const done = n < currentStep;
        const reachable = n <= maxReachedStep;
        const clickable = !!onStepSelect && reachable && !active;

        const content = (
          <>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? "bg-primary-foreground text-primary"
                  : reachable
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-foreground/60"
              }`}
            >
              {n}
            </span>
            <span className="font-medium text-left">
              {stepLabel(n, fields, templateCode)}
            </span>
          </>
        );

        return (
          <li key={n}>
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepSelect(n)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${stepItemClass(active, done || reachable, true)}`}
              >
                {content}
              </button>
            ) : (
              <div
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${stepItemClass(active, done, false)}`}
              >
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
