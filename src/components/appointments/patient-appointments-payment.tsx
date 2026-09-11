"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DisplayPrice } from "@/components/currency/display-price";
import { CancelAppointmentButton } from "@/components/booking/cancel-appointment-button";
import { RescheduleAppointmentButton } from "@/components/booking/reschedule-appointment-button";
import { useBookingTimezone } from "@/contexts/booking-timezone-context";
import { CLINIC_TIMEZONE } from "@/lib/clinic-timezone";
import { formatDateTimeInZone } from "@/lib/timezone/display";
import {
  appointmentStatusLabels,
  modalityLabels,
  paymentPhaseLabels,
  paymentStatusLabels,
} from "@/lib/appointment-labels";
import type { AppointmentDTO } from "@/server/actions/booking.queries";
import { addAppointmentRemainderToCart } from "@/server/actions/cart.actions";

const statusStyles: Record<string, string> = {
  PENDING: "bg-accent/15 text-accent",
  CONFIRMED: "bg-primary/15 text-primary",
  COMPLETED: "bg-foreground/10 text-foreground/60",
};

function AppointmentWhen({ iso }: { iso: string }) {
  const { formatAppointmentDateTime, showsClinicReference } =
    useBookingTimezone();
  const primary = formatAppointmentDateTime(iso);
  if (!showsClinicReference) return <>{primary}</>;
  const clinic = formatDateTimeInZone(iso, CLINIC_TIMEZONE);
  return (
    <>
      <span className="block">{primary}</span>
      <span className="mt-0.5 block text-[11px] font-normal text-foreground/50">
        {clinic} (Argentina)
      </span>
    </>
  );
}

function PaymentPlanSummary({ appointment }: { appointment: AppointmentDTO }) {
  const plan = appointment.paymentPlan;
  const phases = appointment.paymentPhases;
  if (!plan && !phases) return null;

  if (plan) {
    return (
      <div className="mt-4 w-full rounded-2xl bg-primary/[0.06] p-4 ring-1 ring-primary/10">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">
          Plan en 2 cuotas
        </p>
        <dl className="mt-3 space-y-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-foreground/55">Ya abonado</dt>
            <dd className="text-right font-semibold tabular-nums text-foreground">
              <DisplayPrice amount={plan.advanceAmount} currency="ARS" />
              <span className="ml-1 text-xs font-medium text-foreground/45">
                ({plan.advancePercent}%)
              </span>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-foreground/55">Saldo pendiente</dt>
            <dd className="text-right font-semibold tabular-nums text-primary">
              <DisplayPrice amount={plan.remainderAmount} currency="ARS" />
            </dd>
          </div>
          <div className="border-t border-primary/10 pt-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-xs text-foreground/45">Total cita</dt>
              <dd className="text-right text-xs font-medium tabular-nums text-foreground/60">
                <DisplayPrice amount={plan.totalAmount} currency="ARS" />
              </dd>
            </div>
          </div>
        </dl>

        {plan.stage === "awaiting_advance" && (
          <p className="mt-3 text-center text-xs leading-relaxed text-amber-800">
            Adelanto en revisión. Cuando se confirme, podrás pagar el saldo el
            día de tu cita.
          </p>
        )}

        {plan.stage === "remainder_scheduled" && plan.remainderLockedMessage && (
          <p className="mt-3 text-center text-xs leading-relaxed text-foreground/55">
            {plan.remainderLockedMessage}
          </p>
        )}

        {plan.stage === "remainder_in_review" && (
          <p className="mt-3 text-center text-xs leading-relaxed text-sky-800">
            Saldo enviado — Anttova está revisando tu comprobante.
          </p>
        )}

        {plan.stage === "remainder_payable" && (
          <AddRemainderToCartButton appointmentId={appointment.id} />
        )}
      </div>
    );
  }

  if (phases) {
    return (
      <p className="mt-3 text-center text-xs text-foreground/50">
        Adelanto ({paymentPhaseLabels[phases.advanceStatus]}) · Saldo (
        {paymentPhaseLabels[phases.remainderStatus]})
      </p>
    );
  }

  return null;
}

function AddRemainderToCartButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const res = await addAppointmentRemainderToCart(appointmentId);
          if (res.ok) {
            router.push("/dashboard/patient/cart?saldo=agregado");
            router.refresh();
          } else {
            alert(res.message);
          }
        })
      }
      className="mt-4 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
    >
      {isPending ? "Agregando…" : "Agregar saldo al carrito"}
    </button>
  );
}

function AppointmentCard({ appointment: a }: { appointment: AppointmentDTO }) {
  const payStatus =
    a.paymentPhases?.overallStatus ?? a.paymentStatus ?? "PENDING";
  const canManage =
    ["PENDING", "CONFIRMED"].includes(a.status) &&
    new Date(a.start) > new Date();

  return (
    <article className="w-full rounded-[28px] bg-white p-5 shadow-md ring-1 ring-foreground/5">
      <header className="text-center">
        <h3 className="text-base font-semibold leading-snug text-primary">
          {a.title}
        </h3>
        <div className="mt-2 text-sm text-foreground/60">
          <AppointmentWhen iso={a.start} />
        </div>
        <p className="mt-1.5 text-xs font-medium text-foreground/45">
          {modalityLabels[a.modality] ?? a.modality}
        </p>
      </header>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            statusStyles[a.status] ?? "bg-muted"
          }`}
        >
          {appointmentStatusLabels[a.status] ?? a.status}
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground/70">
          {paymentStatusLabels[payStatus] ?? payStatus}
        </span>
      </div>

      <PaymentPlanSummary appointment={a} />

      {canManage && (
        <footer className="mt-4 w-full space-y-3 border-t border-foreground/8 pt-4">
          <div className="w-full">
            <RescheduleAppointmentButton appointmentId={a.id} />
          </div>
          <div className="flex justify-center">
            <CancelAppointmentButton appointmentId={a.id} />
          </div>
        </footer>
      )}
    </article>
  );
}

export function PatientAppointmentsPayment({
  appointments,
}: {
  appointments: AppointmentDTO[];
}) {
  return (
    <section className="mx-auto mt-10 w-full max-w-[344px]">
      <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
        Mis citas
      </p>

      <div className="mt-4 flex flex-col items-center gap-4">
        {appointments.length === 0 && (
          <p className="py-6 text-center text-sm text-foreground/50">
            Aún no tienes citas agendadas.
          </p>
        )}
        {appointments.map((a) => (
          <AppointmentCard key={a.id} appointment={a} />
        ))}
      </div>

      <p className="mt-6 px-2 text-center text-xs leading-relaxed text-foreground/45">
        El saldo se paga desde el{" "}
        <Link href="/dashboard/patient/cart" className="font-semibold text-primary">
          carrito
        </Link>
        , el día de tu cita y dentro del horario agendado.
      </p>
    </section>
  );
}
