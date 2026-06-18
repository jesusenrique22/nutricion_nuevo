import Link from "next/link";
import type { ReactNode } from "react";
import { DisplayPrice } from "@/components/currency/display-price";
import { PaymentPatientEvidence } from "@/components/payments/payment-patient-evidence";
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

const resourceTypeLabels: Record<string, string> = {
  EBOOK: "E-book",
  VIDEO: "Video",
  LINK: "Enlace",
  PACKAGE: "Paquete",
};

const pendingKindLabels: Record<AdminPendingPaymentItem["kind"], string> = {
  RESOURCE: "Recurso",
  APPOINTMENT_ADVANCE: "Adelanto cita",
  APPOINTMENT_REMAINDER: "Saldo cita",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

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
  appointments,
  purchases,
  pendingPayments,
}: {
  appointments: PatientFichaAppointment[];
  purchases: PatientFichaPurchase[];
  pendingPayments: AdminPendingPaymentItem[];
}) {
  return (
    <>
      <Section
        title="Consultas"
        description="Historial de citas agendadas con este paciente."
      >
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
        description="Contenido con acceso aprobado para este paciente."
      >
        {purchases.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Aún no tiene recursos ni paquetes comprados.
          </p>
        ) : (
          <div className="space-y-3">
            {purchases.map((p) => (
              <article
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-foreground/10 p-4"
              >
                <div className="min-w-0">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {resourceTypeLabels[p.type] ?? p.type}
                  </span>
                  <h3 className="mt-2 font-semibold">{p.title}</h3>
                  <p className="mt-1 text-xs text-foreground/50">
                    Comprado el {fmtDate(p.purchasedAt)}
                    {p.grantedAt
                      ? ` · Acceso desde ${fmtDate(p.grantedAt)}`
                      : null}
                  </p>
                </div>
                <p className="text-lg font-bold text-primary">
                  <DisplayPrice amount={p.pricePaid} currency="ARS" />
                </p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Pagos pendientes"
        description="Pagos que aún requieren revisión o confirmación."
      >
        {pendingPayments.length === 0 ? (
          <p className="text-sm text-foreground/50">
            No hay pagos pendientes para este paciente.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingPayments.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4"
              >
                <div className="min-w-0">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    {pendingKindLabels[item.kind]}
                  </span>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  <p className="text-sm text-foreground/60">{item.subtitle}</p>
                  <div className="mt-3">
                    <PaymentPatientEvidence
                      paymentMethod={item.paymentMethod}
                      patientReference={item.patientReference}
                      patientNote={item.patientNote}
                      proofUrls={item.proofUrls}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    <DisplayPrice amount={item.amount} currency="ARS" />
                  </p>
                  <p className="text-xs text-foreground/45">
                    {fmtDateTime(item.createdAt)}
                  </p>
                </div>
              </article>
            ))}
            <Link
              href="/dashboard/admin/payments"
              className="inline-block text-sm font-semibold text-primary hover:underline"
            >
              Gestionar en Pagos →
            </Link>
          </div>
        )}
      </Section>
    </>
  );
}
