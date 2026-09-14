"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DisplayPrice } from "@/components/currency/display-price";
import { CLINIC_TIMEZONE } from "@/lib/clinic-timezone";
import {
  appointmentStatusLabels,
  cancelledByLabels,
  modalityLabels,
  paymentPhaseLabels,
  paymentStatusLabels,
} from "@/lib/appointment-labels";
import { isTwoPhaseSplit } from "@/lib/payment-policy-resolve";
import {
  cancelAppointment,
  updateAppointmentStatus,
} from "@/server/actions/appointment-status.actions";
import type { PatientFichaAppointment } from "@/server/actions/patient.queries";

const statusStyles: Record<string, string> = {
  PENDING: "bg-accent/15 text-accent",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
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
    timeZone: CLINIC_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientFichaAppointmentCard({
  appointment: a,
}: {
  appointment: PatientFichaAppointment;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get("appointmentId");
  const isTarget = targetId === a.id;
  const cardRef = useRef<HTMLElement>(null);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isTarget && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isTarget]);

  const payStatus =
    a.paymentPhases?.overallStatus ?? a.paymentStatus ?? "PENDING";

  function handleUpdateStatus(newStatus: "CONFIRMED" | "COMPLETED") {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateAppointmentStatus({
        appointmentId: a.id,
        status: newStatus,
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          text: newStatus === "CONFIRMED" ? "Cita aceptada y confirmada." : "Cita marcada como completada.",
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    });
  }

  function handleCancel(reason: string) {
    if (!confirm(`¿Confirmas que deseas cancelar/rechazar esta cita?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await cancelAppointment({
        appointmentId: a.id,
        reason,
      });
      if (res.ok) {
        setFeedback({ type: "success", text: "Cita cancelada/rechazada." });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    });
  }

  return (
    <article
      ref={cardRef}
      id={`appt-${a.id}`}
      className={`rounded-2xl border p-4 transition-all ${
        isTarget
          ? "border-primary/50 bg-primary/[0.03] ring-2 ring-primary/30 shadow-md"
          : "border-foreground/10 bg-white"
      }`}
    >
      {isTarget && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <span>📍</span> Cita seleccionada de la notificación
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{a.title}</h3>
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

      {a.paymentPhases &&
        isTwoPhaseSplit(a.paymentPhases.advancePercent) &&
        a.paymentPhases.advanceStatus === "PAID" &&
        a.paymentPhases.remainderStatus === "PENDING" && (
          <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-xs text-amber-950">
            <strong>Plan 2 cuotas:</strong> adelanto pagado · falta saldo{" "}
            <DisplayPrice
              amount={a.paymentPhases.remainderAmount}
              currency="ARS"
            />{" "}
            el día de la cita (
            {new Date(a.start).toLocaleString("es", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            )
          </div>
        )}

      {a.paymentPhases && (
        <p className="mt-3 text-xs text-foreground/55">
          {isTwoPhaseSplit(a.paymentPhases.advancePercent) ? (
            <>
              Adelanto{" "}
              <DisplayPrice
                amount={a.paymentPhases.advanceAmount}
                currency="ARS"
              />{" "}
              ({paymentPhaseLabels[a.paymentPhases.advanceStatus]}) · Saldo{" "}
              <DisplayPrice
                amount={a.paymentPhases.remainderAmount}
                currency="ARS"
              />{" "}
              ({paymentPhaseLabels[a.paymentPhases.remainderStatus]})
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
              ({paymentPhaseLabels[a.paymentPhases.remainderStatus]})
            </>
          )}
        </p>
      )}

      {/* Acciones directas para la nutricionista */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-foreground/5 pt-3">
        {a.status === "PENDING" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleUpdateStatus("CONFIRMED")}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              ✓ Aceptar cita
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCancel("Rechazada por la profesional")}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              ✕ Rechazar cita
            </button>
          </>
        )}

        {a.status === "CONFIRMED" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleUpdateStatus("COMPLETED")}
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted/40 disabled:opacity-50"
            >
              Marcar completada
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCancel("Cancelada por la profesional")}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Cancelar cita
            </button>
          </>
        )}

        {isPending && (
          <span className="text-xs text-foreground/50 animate-pulse">
            Actualizando...
          </span>
        )}

        {feedback && (
          <span
            className={`text-xs font-medium ${
              feedback.type === "success" ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {feedback.text}
          </span>
        )}
      </div>
    </article>
  );
}
