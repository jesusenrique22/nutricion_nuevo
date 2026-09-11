import Link from "next/link";
import { DisplayPrice } from "@/components/currency/display-price";
import { PaymentPatientEvidence } from "@/components/payments/payment-patient-evidence";
import { ArrowRightIcon } from "@/components/ui/link-icons";
import type { PatientPendingPaymentItem } from "@/server/actions/patient-progress.queries";

const kindLabels: Record<PatientPendingPaymentItem["kind"], string> = {
  RESOURCE: "Recurso",
  APPOINTMENT_ADVANCE: "Pago de cita",
  APPOINTMENT_REMAINDER: "Saldo de cita",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientPendingPaymentsPanel({
  items,
}: {
  items: PatientPendingPaymentItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-foreground/15 bg-white/60 px-6 py-10 text-center">
        <p className="text-sm text-foreground/60">
          No tenés pagos pendientes de revisión.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                {kindLabels[item.kind]}
              </span>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="text-sm text-foreground/60">{item.subtitle}</p>
              <p className="mt-2 text-xs text-foreground/50">
                Enviado · {fmtDateTime(item.createdAt)}
              </p>
              <div className="mt-3">
                <PaymentPatientEvidence
                  paymentMethod={item.paymentMethod}
                  patientReference={item.patientReference}
                  patientNote={item.patientNote}
                  proofUrls={item.proofUrls}
                />
              </div>
            </div>
            <p className="text-lg font-bold text-primary">
              <DisplayPrice amount={item.amount} currency="ARS" />
            </p>
            {item.totalAmount ? (
              <p className="mt-1 text-right text-xs text-foreground/50">
                Total cita:{" "}
                <DisplayPrice amount={item.totalAmount} currency="ARS" />
              </p>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-amber-900/75">
            Anttova está revisando tu comprobante. Te avisaremos cuando se
            confirme el pago.
          </p>
        </article>
      ))}
      <Link
        href="/dashboard/patient/cart"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        Ir al carrito
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
