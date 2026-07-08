import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletePatientAccountButton } from "@/components/admin/delete-patient-account-button";
import { PatientAdminResourceEditor } from "@/components/admin/patient-admin-resource-editor";
import { PatientFichaSections } from "@/components/admin/patient-ficha-sections";
import { ProfileEmojiBanner } from "@/components/brand/profile-emoji-banner";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import {
  formatPatientGender,
  formatPatientHeight,
} from "@/lib/patient-ficha-format";
import { getConsultationTypes } from "@/server/actions/booking.queries";
import { getPatientPendingPayments } from "@/server/actions/payment-admin.queries";
import {
  getPatientAppointmentsAdmin,
  getPatientDetail,
  getPatientPurchasesAdmin,
} from "@/server/actions/patient.queries";
import { getPublishedResourcesForPatientAdmin } from "@/server/actions/resource.queries";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, appointments, purchases, pendingPayments, consultationTypes, resourceCatalog] =
    await Promise.all([
      getPatientDetail(id),
      getPatientAppointmentsAdmin(id),
      getPatientPurchasesAdmin(id),
      getPatientPendingPayments(id),
      getConsultationTypes(),
      getPublishedResourcesForPatientAdmin(id),
    ]);

  if (!patient) notFound();

  return (
    <div className="w-full">
      <Link
        href="/dashboard/admin/patients"
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Volver a pacientes
      </Link>

      <div className="mt-4 flex w-full flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <ProfileEmojiBanner
            name={patient.name}
            subtitle={
              [patient.email, patient.phone].filter(Boolean).join(" · ") ||
              undefined
            }
            statusLabel={
              FEATURE_FLAGS.FORMS_ENABLED
                ? patient.profile?.hasCompletedIntake
                  ? "Ingreso completado"
                  : "Ingreso pendiente"
                : undefined
            }
            statusTone={
              FEATURE_FLAGS.FORMS_ENABLED
                ? patient.profile?.hasCompletedIntake
                  ? "primary"
                  : "accent"
                : undefined
            }
          />
        </div>
        <DeletePatientAccountButton
          patientId={patient.id}
          patientName={patient.name}
          redirectTo="/dashboard/admin/patients"
          className="shrink-0 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        />
      </div>

      {patient.profile ? (
        <section className="mt-8 w-full rounded-2xl border border-foreground/10 bg-white p-6">
          <h2 className="text-lg font-bold">Datos personales</h2>
          <p className="mt-1 text-sm text-foreground/50">
            Se completan al enviar un formulario de consulta o ingreso.
          </p>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-foreground/8 bg-surface/50 px-4 py-3">
              <dt className="text-foreground/50">Género</dt>
              <dd className="mt-1 text-base font-semibold">
                {formatPatientGender(patient.profile.gender)}
              </dd>
            </div>
            <div className="rounded-xl border border-foreground/8 bg-surface/50 px-4 py-3">
              <dt className="text-foreground/50">Estatura</dt>
              <dd className="mt-1 text-base font-semibold">
                {formatPatientHeight(patient.profile.height)}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="mt-8 w-full rounded-2xl border border-foreground/10 bg-white p-6">
          <p className="text-sm text-foreground/50">
            Este paciente aún no completó su perfil.
          </p>
        </section>
      )}

      <PatientAdminResourceEditor
        patientId={patient.id}
        initialUrl={patient.profile?.adminResourceUrl ?? null}
        initialNote={patient.profile?.adminResourceNote ?? null}
      />

      <PatientFichaSections
        patientId={patient.id}
        appointments={appointments}
        purchases={purchases}
        pendingPayments={pendingPayments}
        consultationTypes={consultationTypes}
        resourceCatalog={resourceCatalog}
      />
    </div>
  );
}
