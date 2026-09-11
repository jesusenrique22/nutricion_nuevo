import { DisplayPrice } from "@/components/currency/display-price";
import { paymentPhaseLabels } from "@/lib/appointment-labels";

export function AdminAppointmentSplitPayment({
  paidAdvanceAmount,
  remainderAmount,
  totalAmount,
  appointmentStart,
  advanceStatus = "PAID",
  remainderStatus = "PENDING",
  awaitingPatientPayment,
}: {
  paidAdvanceAmount: string;
  remainderAmount: string;
  totalAmount: string;
  appointmentStart?: string | null;
  advanceStatus?: string;
  remainderStatus?: string;
  awaitingPatientPayment?: boolean;
}) {
  const appointmentLabel = appointmentStart
    ? new Date(appointmentStart).toLocaleString("es", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] p-4 text-sm">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">
        Plan en 2 cuotas
      </p>
      <dl className="mt-3 space-y-2.5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-foreground/55">Ya abonó (adelanto)</dt>
          <dd className="text-right font-semibold tabular-nums text-emerald-700">
            <DisplayPrice amount={paidAdvanceAmount} currency="ARS" />
            <span className="ml-1 text-xs font-medium text-foreground/45">
              ({paymentPhaseLabels[advanceStatus] ?? advanceStatus})
            </span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-foreground/55">Falta pagar (saldo)</dt>
          <dd className="text-right font-semibold tabular-nums text-primary">
            <DisplayPrice amount={remainderAmount} currency="ARS" />
            <span className="ml-1 text-xs font-medium text-foreground/45">
              ({paymentPhaseLabels[remainderStatus] ?? remainderStatus})
            </span>
          </dd>
        </div>
        <div className="border-t border-primary/10 pt-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs text-foreground/45">Total cita</dt>
            <dd className="text-right text-xs font-medium tabular-nums text-foreground/60">
              <DisplayPrice amount={totalAmount} currency="ARS" />
            </dd>
          </div>
        </div>
      </dl>
      {appointmentLabel && (
        <p className="mt-3 text-center text-xs leading-relaxed text-foreground/55">
          Saldo a cobrar el día de la cita:{" "}
          <strong className="text-foreground/75">{appointmentLabel}</strong>
        </p>
      )}
      {awaitingPatientPayment && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
          El paciente aún no envió comprobante del saldo. Podrá pagarlo desde el
          carrito en el horario de la consulta.
        </p>
      )}
    </div>
  );
}
