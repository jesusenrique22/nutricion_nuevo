import Link from "next/link";
import type { PatientFormHistoryItem } from "@/server/actions/patient.queries";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const flowLabels: Record<string, string> = {
  INTAKE: "1ª cita",
  FOLLOW_UP: "Seguimiento",
};

export function PatientFormHistory({
  patientId,
  items,
}: {
  patientId: string;
  items: PatientFormHistoryItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="mt-3 text-sm text-foreground/50">
        Este paciente aún no ha enviado formularios.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div
          key={`${item.formKey}-${item.submittedAt}`}
          className="flex flex-col gap-3 rounded-xl border border-foreground/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="font-semibold">{item.title}</div>
            <div className="mt-1 text-sm text-foreground/60">
              {item.consultationName}
              {item.appointmentDate
                ? ` · Cita ${fmt(item.appointmentDate)}`
                : ""}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.flow && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground/70">
                  {flowLabels[item.flow] ?? item.flow}
                </span>
              )}
              <span className="text-xs text-foreground/50">
                Enviado {fmt(item.submittedAt)}
              </span>
            </div>
          </div>
          <Link
            href={`/dashboard/admin/patients/${patientId}/forms/${item.formKey}`}
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            Ver formulario →
          </Link>
        </div>
      ))}
    </div>
  );
}
