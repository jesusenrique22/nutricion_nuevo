"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DisplayPrice } from "@/components/currency/display-price";
import { PaymentPatientEvidence } from "@/components/payments/payment-patient-evidence";
import type { AdminPendingPaymentItem } from "@/server/actions/payment-admin.queries";
import {
  approveAppointmentAdvance,
  approveAppointmentRemainder,
  approveResourcePayment,
  approveProductPayment,
} from "@/server/actions/payment-admin.actions";

const kindLabels: Record<AdminPendingPaymentItem["kind"], string> = {
  RESOURCE: "Recurso",
  PRODUCT: "Producto",
  APPOINTMENT_ADVANCE: "Adelanto cita",
  APPOINTMENT_REMAINDER: "Saldo cita",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PatientFichaPendingPayments({
  items,
}: {
  items: AdminPendingPaymentItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function approve(item: AdminPendingPaymentItem) {
    startTransition(async () => {
      let res: { ok: boolean; message?: string };
      if (item.kind === "RESOURCE" && item.purchaseId) {
        res = await approveResourcePayment({ purchaseId: item.purchaseId });
      } else if (item.kind === "PRODUCT" && item.purchaseId) {
        res = await approveProductPayment({ purchaseId: item.purchaseId });
      } else if (item.kind === "APPOINTMENT_ADVANCE" && item.appointmentId) {
        res = await approveAppointmentAdvance({
          appointmentId: item.appointmentId,
        });
      } else if (item.kind === "APPOINTMENT_REMAINDER" && item.appointmentId) {
        res = await approveAppointmentRemainder({
          appointmentId: item.appointmentId,
        });
      } else {
        return;
      }
      if (!res.ok) alert(res.message ?? "No se pudo aprobar.");
      else router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground/50">
        No hay pagos pendientes para este paciente.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                {kindLabels[item.kind]}
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
              <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/45">
                {item.totalAmount ? "Cuota" : "Monto"}
              </p>
              <p className="text-lg font-bold text-primary">
                <DisplayPrice amount={item.amount} currency="ARS" />
              </p>
              {item.totalAmount ? (
                <p className="mt-1 text-xs text-foreground/50">
                  Total cita:{" "}
                  <DisplayPrice amount={item.totalAmount} currency="ARS" />
                </p>
              ) : null}
              <p className="text-xs text-foreground/45">
                {fmtDateTime(item.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => approve(item)}
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Confirmar pago
          </button>
        </article>
      ))}
    </div>
  );
}
