"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DisplayPrice } from "@/components/currency/display-price";
import type { PatientProgressItem } from "@/server/actions/patient-progress.queries";
import {
  requestAppointmentRefund,
  requestResourceRefund,
} from "@/server/actions/refund.actions";

const statusStyles: Record<string, string> = {
  "Pago en revisión": "bg-amber-100 text-amber-800",
  "Adelanto en revisión": "bg-amber-100 text-amber-800",
  "Procesando adelanto": "bg-amber-100 text-amber-800",
  "Reembolso en revisión": "bg-orange-100 text-orange-800",
  Pagado: "bg-emerald-100 text-emerald-800",
  "Acceso activo": "bg-emerald-100 text-emerald-800",
  "Compra confirmada": "bg-emerald-100 text-emerald-800",
  "Cita confirmada": "bg-emerald-100 text-emerald-800",
  "Consulta completada": "bg-emerald-100 text-emerald-800",
  Cancelada: "bg-red-100 text-red-700",
  Reembolsado: "bg-red-100 text-red-700",
  "Reembolso no aceptado": "bg-muted text-foreground/70",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PatientPurchasesPanel({
  items,
}: {
  items: PatientProgressItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function submitRefund(item: PatientProgressItem) {
    startTransition(async () => {
      const res =
        item.kind === "APPOINTMENT"
          ? await requestAppointmentRefund({
              appointmentId: item.entityId,
              note: note.trim() || undefined,
            })
          : await requestResourceRefund({
              purchaseId: item.entityId,
              note: note.trim() || undefined,
            });

      if (res.ok) {
        setOpenId(null);
        setNote("");
        router.refresh();
      } else {
        alert(res.message);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-foreground/15 bg-white/60 px-6 py-12 text-center">
        <p className="text-sm text-foreground/60">
          Cuando confirmes un pedido con pago, tus citas y recursos aparecerán
          aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const refundOpen = openId === item.id;
        return (
          <article
            key={item.id}
            className="rounded-2xl border border-foreground/10 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {item.kind === "APPOINTMENT"
                    ? "Cita"
                    : item.kind === "PRODUCT"
                      ? "Producto"
                      : "Recurso"}
                </p>
                <h3 className="mt-1 font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-foreground/60">{item.subtitle}</p>
                <p className="mt-2 text-sm font-bold text-primary">
                  <DisplayPrice amount={item.amount} currency="ARS" />
                </p>
                <p className="mt-1 text-xs text-foreground/45">
                  Pedido · {fmt(item.purchasedAt)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  statusStyles[item.statusLabel] ?? "bg-muted text-foreground"
                }`}
              >
                {item.statusLabel}
              </span>
            </div>

            {item.refundStatus === "DENIED" && item.refundAdminNote && (
              <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-foreground/70">
                Respuesta de Anttova: {item.refundAdminNote}
              </p>
            )}

            {item.refundStatus === "REQUESTED" && (
              <p className="mt-3 text-xs text-foreground/55">
                Tu solicitud fue enviada. Anttova te contactará para gestionar el
                reembolso.
              </p>
            )}

            {item.canRequestRefund && !refundOpen && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setOpenId(item.id);
                  setNote("");
                }}
                className="mt-4 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
              >
                Solicitar reembolso
              </button>
            )}

            {refundOpen && (
              <div className="mt-4 space-y-3 rounded-xl border border-foreground/10 bg-muted/20 p-4">
                <p className="text-sm text-foreground/70">
                  Anttova revisará tu solicitud y te contactará para coordinar el
                  reembolso.
                </p>
                <label className="block text-sm">
                  <span className="font-semibold">Motivo (opcional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="mt-2 w-full resize-none rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="Contanos brevemente por qué pedís el reembolso"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => submitRefund(item)}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {isPending ? "Enviando…" : "Confirmar solicitud"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setOpenId(null)}
                    className="rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
