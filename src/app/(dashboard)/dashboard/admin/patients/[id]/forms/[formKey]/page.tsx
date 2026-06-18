import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormSubmissionView } from "@/components/forms/form-submission-view";
import { areFormsEnabled } from "@/lib/feature-flags";
import { getAdminFormSubmissionDetail } from "@/server/actions/patient.queries";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const flowLabels: Record<string, string> = {
  INTAKE: "Primera consulta",
  FOLLOW_UP: "Seguimiento",
};

export default async function AdminPatientFormPage({
  params,
}: {
  params: Promise<{ id: string; formKey: string }>;
}) {
  if (!areFormsEnabled()) {
    const { id } = await params;
    redirect(`/dashboard/admin/patients/${id}`);
  }

  const { id, formKey } = await params;
  const form = await getAdminFormSubmissionDetail(id, formKey);
  if (!form) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/admin/patients/${id}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Volver a ficha de {form.patientName}
      </Link>

      <header className="mt-4 rounded-2xl border border-foreground/10 bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          {form.consultationName}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{form.title}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-foreground/50">Paciente</dt>
            <dd className="font-medium">{form.patientName}</dd>
          </div>
          {form.appointmentDate && (
            <div>
              <dt className="text-foreground/50">Fecha de cita</dt>
              <dd className="font-medium">{fmt(form.appointmentDate)}</dd>
            </div>
          )}
          <div>
            <dt className="text-foreground/50">Enviado el</dt>
            <dd className="font-medium">{fmt(form.submittedAt)}</dd>
          </div>
          {form.flow && (
            <div>
              <dt className="text-foreground/50">Tipo de cita</dt>
              <dd className="font-medium">{flowLabels[form.flow] ?? form.flow}</dd>
            </div>
          )}
        </dl>
      </header>

      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Respuestas del paciente</h2>
        <div className="mt-6">
          <FormSubmissionView rows={form.rows} />
        </div>
      </section>
    </div>
  );
}
