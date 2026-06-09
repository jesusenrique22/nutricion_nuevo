"use client";

export function FormWizardProgress({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm font-semibold text-foreground/60">
        <span>
          Página {step} de {total}
        </span>
        <span>{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function FormWizardNav({
  step,
  total,
  onBack,
  onNext,
  isPending,
}: {
  step: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-3">
      {step > 1 && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-foreground/15 px-6 py-3 font-semibold transition hover:bg-muted"
        >
          Atrás
        </button>
      )}
      {step < total ? (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.01]"
        >
          Siguiente
        </button>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:scale-[1.01] disabled:opacity-50"
        >
          {isPending ? "Enviando…" : "Enviar formulario"}
        </button>
      )}
    </div>
  );
}
