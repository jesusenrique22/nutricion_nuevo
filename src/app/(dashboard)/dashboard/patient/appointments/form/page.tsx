import { redirect } from "next/navigation";
import { DynamicConsultationForm } from "@/components/forms/dynamic-consultation-form";
import { PatientFormFlow } from "@/components/forms/patient-form-flow";
import { templateCodeForFormType } from "@/lib/form-template-routing";
import type { ConsultationFormType } from "@/lib/form-routing";
import { getFormTemplateByCode } from "@/server/actions/cms.actions";
import {
  getPendingFormAppointments,
  getPendingFormContext,
} from "@/server/actions/patient.queries";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const titles: Record<ConsultationFormType, string> = {
  anthropometry: "Formulario de antropometría",
  nutrition: "Primera consulta nutricional",
  training: "Primera consulta de entrenamiento",
  intake: "Formulario de ingreso",
  follow_up: "Formulario de seguimiento",
};

const descriptions: Record<ConsultationFormType, string> = {
  anthropometry:
    "Completa este formulario antes de tu evaluación antropométrica.",
  nutrition: "Formulario de primera consulta nutricional Anttova.",
  training:
    "Formulario de evaluación de entrenamiento. Completalo antes de tu consulta.",
  intake:
    "Es tu primera cita en el sistema. Completa esta anamnesis para que tu nutricionista pueda preparar tu consulta.",
  follow_up:
    "Antes de tu cita de seguimiento, cuéntanos cómo has estado.",
};

const submitLabels: Record<ConsultationFormType, string> = {
  anthropometry: "Enviar formulario de antropometría",
  nutrition: "Enviar consulta nutricional",
  training: "Enviar formulario de entrenamiento",
  intake: "Enviar formulario de ingreso",
  follow_up: "Enviar seguimiento",
};

export default async function AppointmentFormPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; recien?: string }>;
}) {
  const params = await searchParams;
  const slot = params.slot ? Number(params.slot) : 0;
  const preferLatest = params.recien === "1";

  const [ctx, pendingList] = await Promise.all([
    getPendingFormContext(slot, preferLatest),
    getPendingFormAppointments(),
  ]);

  if (!ctx) {
    redirect("/dashboard/patient/appointments");
  }

  const appointmentLabel = fmt(ctx.startTime);
  const templateCode = templateCodeForFormType(ctx.formType);
  const template = templateCode
    ? await getFormTemplateByCode(templateCode)
    : null;

  const pendingLinks = pendingList.map((p, i) => ({
    href:
      i === 0
        ? "/dashboard/patient/appointments/form"
        : `/dashboard/patient/appointments/form?slot=${i}`,
    label: p.title,
    subtitle: new Date(p.start).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <PatientFormFlow
      title={titles[ctx.formType]}
      subtitle={`${ctx.consultationName} · ${appointmentLabel}`}
      description={descriptions[ctx.formType]}
      pendingLinks={pendingLinks}
      activeSlot={slot}
    >
      {template && templateCode ? (
        <DynamicConsultationForm
          templateCode={templateCode}
          appointmentId={ctx.appointmentId}
          fields={template.fields}
          patientEmail={ctx.patientEmail}
          appointmentLabel={appointmentLabel}
          title={titles[ctx.formType]}
          description={descriptions[ctx.formType]}
          submitLabel={submitLabels[ctx.formType]}
        />
      ) : (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          No se encontró la plantilla del formulario. Contacta a tu
          nutricionista o ejecuta el seed del sistema.
        </p>
      )}
    </PatientFormFlow>
  );
}
