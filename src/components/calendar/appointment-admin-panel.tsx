"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { updateAppointmentStatus } from "@/server/actions/appointment-status.actions";
import {
  markAdvancePaid,
  markPaymentPaid,
  markPaymentRefunded,
  markRemainderPaid,
} from "@/server/actions/payment.actions";
import {
  appointmentStatusLabels,
  cancelledByLabels,
  modalityLabels,
  paymentPhaseLabels,
  paymentStatusLabels,
} from "@/lib/appointment-labels";
import { RegisterMeasurementForm } from "@/components/measurements/register-measurement-form";
import { DisplayPrice } from "@/components/currency/display-price";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { isTwoPhaseSplit } from "@/lib/payment-policy-resolve";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusActions: Record<string, { label: string; status: string }[]> = {
  PENDING: [
    { label: "Confirmar", status: "CONFIRMED" },
    { label: "Cancelar", status: "CANCELLED" },
    { label: "No asistió", status: "NO_SHOW" },
  ],
  CONFIRMED: [
    { label: "Completar", status: "COMPLETED" },
    { label: "Cancelar", status: "CANCELLED" },
    { label: "No asistió", status: "NO_SHOW" },
  ],
  NO_SHOW: [{ label: "Marcar completada", status: "COMPLETED" }],
};

export function AppointmentAdminPanel({
  appointment,
  onClose,
}: {
  appointment: AppointmentDTO;
  onClose: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const actions = statusActions[appointment.status] ?? [];

  function runStatus(status: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await updateAppointmentStatus({
        appointmentId: appointment.id,
        status,
      });
      setMessage(res.ok ? "Estado actualizado." : res.message);
      if (res.ok) onClose();
    });
  }

  function runMarkAdvance() {
    setMessage(null);
    startTransition(async () => {
      const res = await markAdvancePaid({
        appointmentId: appointment.id,
        adminNote: paymentNote || undefined,
      });
      setMessage(res.ok ? "Adelanto registrado." : res.message);
    });
  }

  function runMarkRemainder() {
    setMessage(null);
    startTransition(async () => {
      const res = await markRemainderPaid({
        appointmentId: appointment.id,
        adminNote: paymentNote || undefined,
      });
      setMessage(res.ok ? "Saldo final registrado." : res.message);
    });
  }

  function runMarkPaid() {
    setMessage(null);
    startTransition(async () => {
      const res = await markPaymentPaid({
        appointmentId: appointment.id,
        adminNote: paymentNote || undefined,
      });
      setMessage(res.ok ? "Pago registrado." : res.message);
    });
  }

  function runRefund() {
    setMessage(null);
    startTransition(async () => {
      const res = await markPaymentRefunded(appointment.id);
      setMessage(res.ok ? "Pago marcado como reembolsado." : res.message);
    });
  }

  const phases = appointment.paymentPhases;
  const overallStatus = phases?.overallStatus ?? appointment.paymentStatus;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Cerrar panel"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface shadow-2xl sm:max-h-[100dvh] sm:rounded-l-3xl">
        <div className="sticky top-0 z-10 border-b border-foreground/8 bg-surface/95 px-5 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Detalle de cita
              </p>
              <h2 className="mt-1 truncate text-xl font-bold">
                {appointment.consultationName ?? appointment.title}
              </h2>
              <p className="mt-1 text-sm text-foreground/60">
                {appointment.patientName} · {fmt(appointment.start)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold hover:bg-accent-soft"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 px-5 py-5 sm:px-6">

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
            {appointmentStatusLabels[appointment.status] ?? appointment.status}
          </span>
          <span className="rounded-full bg-muted px-3 py-1">
            {modalityLabels[appointment.modality] ?? appointment.modality}
          </span>
          {overallStatus && (
            <span className="rounded-full bg-accent/15 px-3 py-1 font-semibold text-accent">
              {paymentStatusLabels[overallStatus] ?? overallStatus}
              {appointment.price ? (
                <>
                  {" · "}
                  <DisplayPrice amount={appointment.price} currency="ARS" />
                </>
              ) : null}
            </span>
          )}
          {appointment.status === "CANCELLED" && appointment.cancelledBy && (
            <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
              {cancelledByLabels[appointment.cancelledBy] ??
                appointment.cancelledBy}
            </span>
          )}
        </div>

        {phases && (
          <div
            className={`mt-4 grid gap-2 text-sm ${
              isTwoPhaseSplit(phases.advancePercent)
                ? "sm:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {(phases.advancePercent > 0 ||
              isTwoPhaseSplit(phases.advancePercent)) && (
              <div className="rounded-xl border border-foreground/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">
                  {isTwoPhaseSplit(phases.advancePercent)
                    ? `Adelanto (${phases.advancePercent}%)`
                    : "Pago al agendar"}
                </p>
                <p className="mt-1 font-semibold">
                  <DisplayPrice amount={phases.advanceAmount} currency="ARS" />
                </p>
                <p className="text-xs text-foreground/60">
                  {paymentPhaseLabels[phases.advanceStatus] ??
                    phases.advanceStatus}
                </p>
              </div>
            )}
            {(phases.advancePercent < 100 ||
              isTwoPhaseSplit(phases.advancePercent)) && (
              <div className="rounded-xl border border-foreground/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">
                  {isTwoPhaseSplit(phases.advancePercent)
                    ? `Saldo final (${100 - phases.advancePercent}%)`
                    : "Pago al finalizar"}
                </p>
                <p className="mt-1 font-semibold">
                  <DisplayPrice
                    amount={phases.remainderAmount}
                    currency="ARS"
                  />
                </p>
                <p className="text-xs text-foreground/60">
                  {paymentPhaseLabels[phases.remainderStatus] ??
                    phases.remainderStatus}
                </p>
              </div>
            )}
          </div>
        )}

        {appointment.patientId && (
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href={`/dashboard/admin/patients/${appointment.patientId}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ver ficha del paciente →
            </Link>
            {FEATURE_FLAGS.FORMS_ENABLED && (
              <Link
                href={`/dashboard/admin/patients/${appointment.patientId}/forms/${appointment.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Ver formulario de la cita →
              </Link>
            )}
          </div>
        )}

        {actions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold">Acciones</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {actions.map((a) => (
                <button
                  key={a.status}
                  disabled={isPending}
                  onClick={() => runStatus(a.status)}
                  className="rounded-full border border-foreground/15 px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(overallStatus === "PENDING" ||
          overallStatus === "PARTIAL" ||
          appointment.paymentStatus === "PENDING") && (
          <div className="mt-6 space-y-4 rounded-xl border border-foreground/10 p-4">
            <h3 className="text-sm font-bold">Registrar pagos manuales</h3>
            <p className="text-xs text-foreground/50">
              {phases && isTwoPhaseSplit(phases.advancePercent)
                ? "Adelanto al agendar y saldo el día de la consulta."
                : phases && phases.advancePercent >= 100
                  ? "Pago único al agendar la cita."
                  : "Pago único al finalizar la consulta."}
            </p>
            <input
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="Nota opcional (ej. Zelle, Mercado Pago)"
              className="w-full rounded-xl border border-foreground/15 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-2">
              {phases &&
                phases.advancePercent > 0 &&
                phases.advanceStatus !== "PAID" && (
                <button
                  disabled={isPending}
                  onClick={runMarkAdvance}
                  className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
                >
                  {isTwoPhaseSplit(phases.advancePercent)
                    ? "Registrar adelanto"
                    : "Registrar pago al agendar"}
                </button>
              )}
              {phases &&
                phases.advancePercent < 100 &&
                phases.remainderStatus !== "PAID" && (
                <button
                  disabled={isPending}
                  onClick={runMarkRemainder}
                  className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
                >
                  {isTwoPhaseSplit(phases.advancePercent)
                    ? "Registrar saldo final"
                    : "Registrar pago al finalizar"}
                </button>
              )}
              <button
                disabled={isPending}
                onClick={runMarkPaid}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Pago completo
              </button>
            </div>
          </div>
        )}

        {overallStatus === "PAID" && (
          <div className="mt-6">
            <button
              disabled={isPending}
              onClick={runRefund}
              className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              Marcar reembolso
            </button>
          </div>
        )}

        {appointment.consultationCode === "ANT_03" &&
          appointment.patientId &&
          ["CONFIRMED", "COMPLETED"].includes(appointment.status) && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="text-sm font-bold">Registrar medición ISAK</h3>
              <p className="mt-1 text-xs text-foreground/50">
                Vincula los resultados a esta cita de antropometría.
              </p>
              <div className="mt-3">
                <RegisterMeasurementForm
                  patientId={appointment.patientId}
                  appointmentId={appointment.id}
                  compact
                />
              </div>
            </div>
          )}

        {message && (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>
        )}
        </div>
      </div>
    </div>
  );
}
