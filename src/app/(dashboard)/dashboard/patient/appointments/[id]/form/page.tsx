import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IntakeFormClient } from "@/components/forms/intake-form";
import { FollowUpFormClient } from "@/components/forms/follow-up-form";
import { getAppointmentFormContext } from "@/server/actions/patient.queries";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AppointmentFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAppointmentFormContext(id);
  if (!ctx) notFound();

  if (ctx.isCompleted) {
    redirect("/dashboard/patient/appointments");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/patient/appointments"
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← Volver a mis citas
      </Link>

      <h1 className="mt-4 text-3xl font-bold">
        {ctx.flow === "INTAKE"
          ? "Formulario de ingreso"
          : "Formulario de seguimiento"}
      </h1>
      <p className="mt-2 text-foreground/60">
        {ctx.consultationName} · {fmt(ctx.startTime)}
      </p>

      {ctx.flow === "INTAKE" ? (
        <>
          <p className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-sm text-foreground/80">
            Es tu primera cita en el sistema. Completa esta anamnesis para que
            tu nutricionista pueda preparar tu consulta.
          </p>
          <div className="mt-8">
            <IntakeFormClient appointmentId={ctx.appointmentId} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-foreground/80">
            Antes de tu cita de seguimiento, cuéntanos cómo has estado. Es un
            formulario breve.
          </p>
          <div className="mt-8">
            <FollowUpFormClient appointmentId={ctx.appointmentId} />
          </div>
        </>
      )}
    </div>
  );
}
