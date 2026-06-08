import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatientDetail } from "@/server/actions/patient.queries";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function JsonBlock({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <span className="text-foreground/50">—</span>;
  }
  return (
    <dl className="space-y-2 text-sm">
      {Object.entries(data as Record<string, unknown>).map(([key, val]) => (
        <div key={key}>
          <dt className="font-semibold capitalize text-foreground/70">
            {key.replace(/([A-Z])/g, " $1")}
          </dt>
          <dd className="text-foreground/80">
            {typeof val === "boolean"
              ? val
                ? "Sí"
                : "No"
              : String(val ?? "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const adherenceLabels: Record<string, string> = {
  muy_bien: "Muy bien",
  bien: "Bien",
  regular: "Regular",
  mal: "Mal",
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatientDetail(id);
  if (!patient) notFound();

  return (
    <div>
      <Link
        href="/dashboard/admin/patients"
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Volver a pacientes
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{patient.name}</h1>
          <p className="mt-1 text-foreground/60">
            {patient.email}
            {patient.phone && ` · ${patient.phone}`}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-bold ${
            patient.profile?.hasCompletedIntake
              ? "bg-primary/15 text-primary"
              : "bg-accent/15 text-accent"
          }`}
        >
          {patient.profile?.hasCompletedIntake
            ? "Ingreso completado"
            : "Ingreso pendiente"}
        </span>
      </div>

      {/* Datos del perfil */}
      {patient.profile && (
        <section className="mt-8 rounded-2xl border border-foreground/10 bg-white p-6">
          <h2 className="text-lg font-bold">Datos personales</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-foreground/50">Nacimiento</dt>
              <dd className="font-medium">{fmt(patient.profile.birthDate)}</dd>
            </div>
            <div>
              <dt className="text-foreground/50">Género</dt>
              <dd className="font-medium capitalize">
                {patient.profile.gender ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/50">Estatura</dt>
              <dd className="font-medium">
                {patient.profile.height ? `${patient.profile.height} cm` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/50">Ocupación</dt>
              <dd className="font-medium">
                {patient.profile.occupation ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/50">Emergencia</dt>
              <dd className="font-medium">
                {patient.profile.emergencyPhone ?? "—"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* Anamnesis */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Anamnesis (formulario de ingreso)</h2>
        {!patient.intakeForm ? (
          <p className="mt-3 text-sm text-foreground/50">
            El paciente aún no ha completado su ingreso.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold text-primary">Historial médico</h3>
              <div className="mt-2">
                <JsonBlock data={patient.intakeForm.medicalHistory} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary">Alergias</h3>
              <div className="mt-2">
                <JsonBlock data={patient.intakeForm.allergies} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary">Hábitos alimenticios</h3>
              <div className="mt-2">
                <JsonBlock data={patient.intakeForm.dietaryHabits} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary">Actividad física</h3>
              <div className="mt-2">
                <JsonBlock data={patient.intakeForm.physicalActivity} />
              </div>
            </div>
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-primary">Objetivos</h3>
              <p className="mt-2 text-sm">{patient.intakeForm.goals ?? "—"}</p>
            </div>
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-primary">Suplementos</h3>
              <div className="mt-2">
                <JsonBlock data={patient.intakeForm.supplementsUse} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Seguimientos recientes */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Seguimientos recientes</h2>
        {patient.recentFollowUps.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">
            Sin formularios de seguimiento aún.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {patient.recentFollowUps.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-foreground/10 p-4 text-sm"
              >
                <div className="font-semibold">
                  {f.consultationName} · {fmt(f.appointmentDate)}
                </div>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-foreground/50">Energía</dt>
                    <dd className="capitalize">{f.energyLevel ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Adherencia</dt>
                    <dd>
                      {f.adherence
                        ? (adherenceLabels[f.adherence] ?? f.adherence)
                        : "—"}
                    </dd>
                  </div>
                  {f.currentWeight && (
                    <div>
                      <dt className="text-foreground/50">Peso</dt>
                      <dd>{f.currentWeight} kg</dd>
                    </div>
                  )}
                  {f.symptoms && (
                    <div className="sm:col-span-2">
                      <dt className="text-foreground/50">Síntomas</dt>
                      <dd>{f.symptoms}</dd>
                    </div>
                  )}
                  {f.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-foreground/50">Notas</dt>
                      <dd>{f.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mediciones antropométricas */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Mediciones antropométricas</h2>
        {patient.measurements.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">
            Sin mediciones registradas.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Peso</th>
                  <th className="py-2 pr-4">% Grasa</th>
                  <th className="py-2 pr-4">Cintura</th>
                  <th className="py-2">Cadera</th>
                </tr>
              </thead>
              <tbody>
                {patient.measurements.map((m) => (
                  <tr key={m.id} className="border-b border-foreground/5">
                    <td className="py-2 pr-4">{fmt(m.measuredAt)}</td>
                    <td className="py-2 pr-4">
                      {m.weight ? `${m.weight} kg` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {m.bodyFatPct ? `${m.bodyFatPct}%` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {m.waist ? `${m.waist} cm` : "—"}
                    </td>
                    <td className="py-2">
                      {m.hip ? `${m.hip} cm` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
