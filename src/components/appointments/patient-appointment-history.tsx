"use client";

import { DisplayPrice } from "@/components/currency/display-price";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { CancelAppointmentButton } from "@/components/booking/cancel-appointment-button";
import {
  appointmentStatusLabels,
  modalityLabels,
  paymentPhaseLabels,
  paymentStatusLabels,
} from "@/lib/appointment-labels";
import { isTwoPhaseSplit } from "@/lib/payment-policy-resolve";

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

export function PatientAppointmentHistory({
  appointments,
}: {
  appointments: AppointmentDTO[];
}) {
  return (
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
        {appointments.map((a) => {
          const payStatus =
            a.paymentPhases?.overallStatus ?? a.paymentStatus ?? "PENDING";

          return (
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
                    {a.price ? (
                      <>
                        {" · "}
                        <DisplayPrice amount={a.price} currency="ARS" />
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        statusStyles[a.status] ?? "bg-muted"
                      }`}
                    >
                      {appointmentStatusLabels[a.status] ?? a.status}
                    </span>
                    {payStatus && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          paymentStyles[payStatus] ?? "bg-muted"
                        }`}
                      >
                        {paymentStatusLabels[payStatus] ?? payStatus}
                      </span>
                    )}
                  </div>
                  {a.paymentPhases && (
                    <p className="mt-2 text-xs text-foreground/50">
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
                </div>
                {canCancel(a.status, a.start) && (
                  <CancelAppointmentButton appointmentId={a.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
