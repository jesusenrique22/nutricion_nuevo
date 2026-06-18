"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DisplayPrice } from "@/components/currency/display-price";
import type { AdminRefundRequestItem } from "@/server/actions/patient-progress.queries";
import {
  resolveAppointmentRefund,
  resolveResourceRefund,
} from "@/server/actions/refund.actions";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminRefundRequestsPanel({
  items,
}: {
  items: AdminRefundRequestItem[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function resolve(
    item: AdminRefundRequestItem,
    approved: boolean,
  ) {
    startTransition(async () => {
      const adminNote = notes[item.id]?.trim() || undefined;
      const res =
        item.kind === "APPOINTMENT"
          ? await resolveAppointmentRefund({
              appointmentId: item.entityId,
              approved,
              adminNote,
            })
          : await resolveResourceRefund({
              purchaseId: item.entityId,
              approved,
              adminNote,
            });

      if (res.ok) router.refresh();
      else alert(res.message);
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-foreground/15 bg-white px-6 py-10 text-center text-sm text-foreground/50">
        No hay solicitudes de reembolso pendientes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-800">
                Reembolso · {item.kind === "APPOINTMENT" ? "Cita" : "Recurso"}
              </p>
              <h3 className="mt-1 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-foreground/60">{item.subtitle}</p>
              <p className="mt-2 text-sm">
                <Link
                  href={`/dashboard/admin/patients/${item.patientId}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {item.patientName}
                </Link>
                <span className="text-foreground/50"> · {item.patientEmail}</span>
              </p>
              <p className="mt-1 text-xs text-foreground/50">
                Solicitado · {fmt(item.requestedAt)}
              </p>
            </div>
            <p className="text-lg font-bold text-primary">
              <DisplayPrice amount={item.amount} currency="ARS" />
            </p>
          </div>

          {item.patientNote && (
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm text-foreground/75">
              Motivo del paciente: {item.patientNote}
            </p>
          )}

          <p className="mt-3 text-xs text-foreground/55">
            Contactá al paciente manualmente para coordinar el reembolso. Luego
            marcá si fue aceptado o no.
          </p>

          <textarea
            value={notes[item.id] ?? ""}
            onChange={(e) =>
              setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
            }
            rows={2}
            placeholder="Nota para el paciente (opcional, ej. motivo si se rechaza)"
            className="mt-3 w-full resize-none rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => resolve(item, true)}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Reembolso aceptado
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => resolve(item, false)}
              className="rounded-full border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Reembolso no aceptado
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
