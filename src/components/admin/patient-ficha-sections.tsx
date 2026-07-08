import type { ReactNode } from "react";
import { AdminBookAppointmentForm } from "@/components/admin/admin-book-appointment-form";
import { PatientFichaPendingPayments } from "@/components/admin/patient-ficha-pending-payments";
import { PatientResourceAccessPanel } from "@/components/admin/patient-resource-access-panel";
import { DisplayPrice } from "@/components/currency/display-price";
import {
  appointmentStatusLabels,
  cancelledByLabels,
  modalityLabels,
  paymentPhaseLabels,
  paymentStatusLabels,
} from "@/lib/appointment-labels";
import { isTwoPhaseSplit } from "@/lib/payment-policy-resolve";
import type { AdminPendingPaymentItem } from "@/server/actions/payment-admin.queries";
import type {
  PatientFichaAppointment,
  PatientFichaPurchase,
} from "@/server/actions/patient.queries";
import type { ConsultationTypeDTO } from "@/server/actions/booking.queries";
import type { ResourceDTO } from "@/server/actions/resource.queries";

const statusStyles: Record<string, string> = {
  PENDING: "bg-accent/15 text-accent",
  CONFIRMED: "bg-primary/15 text-primary",
  COMPLETED: "bg-foreground/10 text-foreground/60",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-red-100 text-red-600",
};

const paymentStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PARTIAL: "bg-sky-50 text-sky-700",
  PAID: "bg-green-50 text-green-700",
  REFUNDED: "bg-foreground/10 text-foreground/50",
  FAILED: "bg-red-50 text-red-600",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 w-full rounded-2xl border border-foreground/10 bg-white p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-foreground/50">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PatientFichaSections({
  patientId,
  appointments,
  purchases,
  pendingPayments,
  consultationTypes,
  resourceCatalog,
}: {
  patientId: string;
  appointments: PatientFichaAppointment[];
  purchases: PatientFichaPurchase[];
  pendingPayments: AdminPendingPaymentItem[];
  consultationTypes: ConsultationTypeDTO[];
  resourceCatalog: ResourceDTO[];
}) {
  return (
    <>
      <Section
        title="Consultas"
        description="Historial de citas agendadas con este paciente."
      >
        <AdminBookAppointmentForm
          patientId={patientId}
          consultationTypes={consultationTypes}
        />
        {appointments.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Este paciente aún no tiene consultas registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((a) => {
              const payStatus =
                a.paymentPhases?.overallStatus ?? a.paymentStatus ?? "PENDING";

              return (
                <article
                  key={a.id}
                  className="rounded-xl border border-foreground/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="mt-1 text-sm text-foreground/60">
                        {fmtDateTime(a.start)} ·{" "}
                        {modalityLabels[a.modality] ?? a.modality}
                        {a.flow === "INTAKE" ? " · 1ª cita" : " · Seguimiento"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            statusStyles[a.status] ?? "bg-muted"
                          }`}
                        >
                          {appointmentStatusLabels[a.status] ?? a.status}
                        </span>
                        {a.status === "CANCELLED" && a.cancelledBy && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                            {cancelledByLabels[a.cancelledBy] ?? a.cancelledBy}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            paymentStyles[payStatus] ?? "bg-muted"
                          }`}
                        >
                          {paymentStatusLabels[payStatus] ?? payStatus}
                        </span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      <DisplayPrice amount={a.price} currency="ARS" />
                    </p>
                  </div>
                  {a.paymentPhases && (
                    <p className="mt-3 text-xs text-foreground/55">
                      {isTwoPhaseSplit(a.paymentPhases.advancePercent) ? (
                        <>
                          Adelanto{" "}
                          <DisplayPrice
                            amount={a.paymentPhases.advanceAmount}
                            currency="ARS"
                          />{" "}
                          ({paymentPhaseLabels[a.paymentPhases.advanceStatus]})
                          · Saldo{" "}
                          <DisplayPrice
                            amount={a.paymentPhases.remainderAmount}
                            currency="ARS"
                          />{" "}
                          (
                          {paymentPhaseLabels[a.paymentPhases.remainderStatus]}
                          )
                        </>
                      ) : a.paymentPhases.advancePercent >= 100 ? (
                        <>
                          Pago al agendar{" "}
                          <DisplayPrice
                            amount={a.paymentPhases.advanceAmount}
                            currency="ARS"
                          />{" "}
                          ({paymentPhaseLabels[a.paymentPhases.advanceStatus]})
                        </>
                      ) : (
                        <>
                          Pago al finalizar{" "}
                          <DisplayPrice
                            amount={a.paymentPhases.remainderAmount}
                            currency="ARS"
                          />{" "}
                          ({paymentPhaseLabels[a.paymentPhases.remainderStatus]}
                          )
                        </>
                      )}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Recursos y paquetes"
        description="Desbloqueá contenido pagado o asigná recursos del catálogo."
      >
        <PatientResourceAccessPanel
          patientId={patientId}
          purchases={purchases}
          catalog={resourceCatalog}
        />
      </Section>

      <Section
        title="Pagos pendientes"
        description="Pagos que aún requieren revisión o confirmación."
      >
        <PatientFichaPendingPayments items={pendingPayments} />
      </Section>
    </>
  );
}
