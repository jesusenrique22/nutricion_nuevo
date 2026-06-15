import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileEmojiBanner } from "@/components/brand/profile-emoji-banner";
import { AdminWeeklyPlanEditor } from "@/components/weekly-plan/admin-weekly-plan-editor";
import { getWeeklyPlanForPatientAdmin } from "@/server/actions/weekly-plan.actions";
import { getPatientDetail, getPatientFormHistory } from "@/server/actions/patient.queries";
import { RegisterMeasurementForm } from "@/components/measurements/register-measurement-form";
import { PatientFormHistory } from "@/components/forms/patient-form-history";
import {
  ProgressLineChart,
  buildChartPoints,
} from "@/components/measurements/progress-line-chart";

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
  const [patient, weeklyPlan, formHistory] = await Promise.all([
    getPatientDetail(id),
    getWeeklyPlanForPatientAdmin(id),
    getPatientFormHistory(id),
  ]);
  if (!patient) notFound();

  const weightChart = buildChartPoints(
    patient.measurements.map((m) => ({
      measuredAt: m.measuredAt,
      value: m.weight,
    })),
  );
  const fatChart = buildChartPoints(
    patient.measurements.map((m) => ({
      measuredAt: m.measuredAt,
      value: m.bodyFatPct,
    })),
  );

  const intakeExtra =
    patient.intakeForm?.extendedPayload &&
    typeof patient.intakeForm.extendedPayload === "object"
      ? (patient.intakeForm.extendedPayload as Record<string, unknown>)
      : null;
  const hasIntakeExtra =
    intakeExtra != null && Object.keys(intakeExtra).length > 0;

  return (
    <div>
      <Link
        href="/dashboard/admin/patients"
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Volver a pacientes
      </Link>

      <div className="mt-4">
        <ProfileEmojiBanner
          name={patient.name}
          subtitle={
            [patient.email, patient.phone].filter(Boolean).join(" · ") ||
            undefined
          }
          statusLabel={
            patient.profile?.hasCompletedIntake
              ? "Ingreso completado"
              : "Ingreso pendiente"
          }
          statusTone={
            patient.profile?.hasCompletedIntake ? "primary" : "accent"
          }
        />
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

      {/* Historial de formularios */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Formularios enviados</h2>
        <p className="mt-1 text-sm text-foreground/50">
          Todos los formularios completados por el paciente, con vista detallada
          de cada respuesta.
        </p>
        <PatientFormHistory patientId={patient.id} items={formHistory} />
      </section>

      {/* Anamnesis */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Anamnesis (formulario de ingreso)</h2>
          {patient.intakeForm && (
            <Link
              href={`/dashboard/admin/patients/${patient.id}/forms/intake`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ver formulario completo →
            </Link>
          )}
        </div>
        {!patient.intakeForm ? (
          <p className="mt-3 text-sm text-foreground/50">
            {patient.profile?.hasCompletedIntake
              ? "Ingreso completado vía formulario de consulta (nutrición, entrenamiento o antropometría). No hay anamnesis general separada."
              : "El paciente aún no ha completado su ingreso."}
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
            {hasIntakeExtra && (
                <div className="lg:col-span-2">
                  <h3 className="font-semibold text-primary">
                    Campos adicionales
                  </h3>
                  <div className="mt-2">
                    <JsonBlock data={intakeExtra} />
                  </div>
                </div>
              )}
          </div>
        )}
      </section>

      {/* Consultas nutricionales */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Consultas nutricionales</h2>
        {patient.nutritionForms.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">
            Sin formularios de primera consulta nutricional.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {patient.nutritionForms.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-foreground/10 p-4 text-sm"
              >
                <div className="font-semibold">{fmt(f.appointmentDate)}</div>
                <p className="mt-1 text-foreground/70">{f.consultationReason}</p>
                {f.continuationPreference && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Seguimiento: {f.continuationPreference.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Consultas de entrenamiento */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Formularios de entrenamiento</h2>
        {patient.trainingForms.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">
            Sin formularios de evaluación de entrenamiento.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {patient.trainingForms.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-foreground/10 p-4 text-sm"
              >
                <div className="font-semibold">
                  {f.fullName ?? patient.name} · {fmt(f.appointmentDate)}
                </div>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-foreground/50">Objetivo principal</dt>
                    <dd className="capitalize">
                      {f.mainObjective?.replace(/_/g, " ") ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">
                      Frecuencia de evaluación
                    </dt>
                    <dd className="capitalize">
                      {f.evaluationFrequency?.replace(/_/g, " ") ?? "—"}
                    </dd>
                  </div>
                  {f.procedureQuestions && (
                    <div className="sm:col-span-2">
                      <dt className="text-foreground/50">Dudas / inquietudes</dt>
                      <dd>{f.procedureQuestions}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Formularios de antropometría */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Formularios de antropometría</h2>
        {patient.anthropometryForms.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">
            Sin formularios de antropometría completados.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {patient.anthropometryForms.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-foreground/10 p-4 text-sm"
              >
                <div className="font-semibold">
                  {f.fullName ?? patient.name} · {fmt(f.appointmentDate)}
                </div>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-foreground/50">Objetivo principal</dt>
                    <dd className="capitalize">
                      {f.mainObjective?.replace(/_/g, " ") ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">
                      Frecuencia de evaluación
                    </dt>
                    <dd className="capitalize">
                      {f.evaluationFrequency?.replace(/_/g, " ") ?? "—"}
                    </dd>
                  </div>
                  {f.procedureQuestions && (
                    <div className="sm:col-span-2">
                      <dt className="text-foreground/50">Dudas / inquietudes</dt>
                      <dd>{f.procedureQuestions}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
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

      {/* Plan semanal */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Plan semanal de alimentación</h2>
        <AdminWeeklyPlanEditor
          patientId={patient.id}
          patientName={patient.name}
          initial={weeklyPlan}
        />
      </section>

      {/* Mediciones antropométricas */}
      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-6">
        <h2 className="text-lg font-bold">Mediciones antropométricas</h2>
        <p className="mt-1 text-sm text-foreground/50">
          Registra los resultados ISAK después de cada consulta ANT-03.
        </p>

        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-sm font-bold">Nueva medición</h3>
          <div className="mt-3">
            <RegisterMeasurementForm patientId={patient.id} />
          </div>
        </div>

        {(weightChart.length > 0 || fatChart.length > 0) && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {weightChart.length > 0 && (
              <ProgressLineChart
                title="Evolución de peso"
                unit="kg"
                data={weightChart}
              />
            )}
            {fatChart.length > 0 && (
              <ProgressLineChart
                title="Evolución % grasa"
                unit="%"
                data={fatChart}
                color="#e879a9"
              />
            )}
          </div>
        )}

        {patient.measurements.length === 0 ? (
          <p className="mt-6 text-sm text-foreground/50">
            Sin mediciones registradas.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Peso</th>
                  <th className="py-2 pr-4">% Grasa</th>
                  <th className="py-2 pr-4">Músculo</th>
                  <th className="py-2 pr-4">Cintura</th>
                  <th className="py-2">Cadera</th>
                </tr>
              </thead>
              <tbody>
                {patient.measurements.map((m) => (
                  <tr key={m.id} className="border-b border-foreground/5">
                    <td className="py-2 pr-4">{fmt(m.measuredAt)}</td>
                    <td className="py-2 pr-4">
                      {m.weight != null ? `${m.weight} kg` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {m.bodyFatPct != null ? `${m.bodyFatPct}%` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {m.muscleMass != null ? `${m.muscleMass} kg` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {m.waist != null ? `${m.waist} cm` : "—"}
                    </td>
                    <td className="py-2">
                      {m.hip != null ? `${m.hip} cm` : "—"}
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
