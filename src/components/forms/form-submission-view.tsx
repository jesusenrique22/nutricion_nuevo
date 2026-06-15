import type { FormDisplayRow } from "@/lib/form-submission-display";

export function FormSubmissionView({ rows }: { rows: FormDisplayRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-foreground/50">
        No hay respuestas registradas en este formulario.
      </p>
    );
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.key}
          className={row.value.includes("\n") ? "sm:col-span-2" : undefined}
        >
          <dt className="text-sm font-semibold text-foreground/60">
            {row.label}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
