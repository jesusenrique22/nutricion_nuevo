import { BrandFlowShell } from "@/components/brand/brand-flow-shell";
import { BrandLinkButton } from "@/components/brand/brand-link-button";
import { BookingForm } from "@/components/booking/booking-form";
import { CancelAppointmentButton } from "@/components/booking/cancel-appointment-button";
import {
  getConsultationTypes,
  getMyAppointments,
} from "@/server/actions/booking.queries";
import { getPendingFormAppointments } from "@/server/actions/patient.queries";
import {
  appointmentStatusLabels,
  modalityLabels,
  paymentStatusLabels,
} from "@/lib/appointment-labels";

const statusStyles: Record<string, string> = {
  PENDING: "bg-accent/15 text-accent",
  CONFIRMED: "bg-primary/15 text-primary",
  COMPLETED: "bg-foreground/10 text-foreground/60",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-red-100 text-red-600",
};

const paymentStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-green-50 text-green-700",
  REFUNDED: "bg-foreground/10 text-foreground/50",
  FAILED: "bg-red-50 text-red-600",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canCancel(status: string, start: string) {
  return (
    ["PENDING", "CONFIRMED"].includes(status) && new Date(start) > new Date()
  );
}

export default async function PatientAppointmentsPage() {
  const [types, appointments, pendingForms] = await Promise.all([
    getConsultationTypes(),
    getMyAppointments(),
    getPendingFormAppointments(),
  ]);

  return (
    <BrandFlowShell
      backHref="/dashboard"
      hub={{
        greeting: "Agenda tu consulta con el mismo flujo Anttova.",
        sectionTitle: "",
        compact: true,
      }}
    >
      {pendingForms.length > 0 && (
        <div className="mx-auto mb-8 w-full max-w-[344px] space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
            Pendientes
          </p>
          {pendingForms.map((p, index) => {
            const href =
              index === 0
                ? "/dashboard/patient/appointments/form"
                : `/dashboard/patient/appointments/form?slot=${index}`;
            const label =
              p.formType === "anthropometry"
                ? "Formulario antropometría"
                : p.formType === "nutrition"
                  ? "Consulta nutricional"
                  : p.formType === "training"
                    ? "Consulta entrenamiento"
                    : p.formType === "intake"
                      ? "Formulario de ingreso"
                      : "Seguimiento";

            return (
              <BrandLinkButton
                key={`${p.title}-${p.start}`}
                href={href}
                label={label}
                subtitle={`${p.title} · ${fmt(p.start)}`}
                delay={index * 0.05}
              />
            );
          })}
        </div>
      )}

      <BookingForm types={types} />

      <div className="mx-auto mt-10 w-full max-w-[344px]">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
          Historial
        </p>
        <div className="mt-4 space-y-3">
          {appointments.length === 0 && (
            <p className="text-center text-sm text-foreground/50">
              Aún no tienes citas agendadas.
            </p>
          )}
          {appointments.map((a) => (
            <div
              key={a.id}
              className="rounded-[24px] border border-foreground/10 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{a.title}</div>
                  <div className="mt-1 text-sm text-foreground/50">
                    {fmt(a.start)} · {modalityLabels[a.modality] ?? a.modality}
                    {a.flow === "INTAKE" ? " · 1ª cita" : " · Seguimiento"}
                    {a.price ? ` · $${a.price}` : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        statusStyles[a.status] ?? "bg-muted"
                      }`}
                    >
                      {appointmentStatusLabels[a.status] ?? a.status}
                    </span>
                    {a.paymentStatus && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          paymentStyles[a.paymentStatus] ?? "bg-muted"
                        }`}
                      >
                        {paymentStatusLabels[a.paymentStatus] ??
                          a.paymentStatus}
                      </span>
                    )}
                  </div>
                </div>
                {canCancel(a.status, a.start) && (
                  <CancelAppointmentButton appointmentId={a.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrandFlowShell>
  );
}
