"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DisplayPrice } from "@/components/currency/display-price";
import { PaymentPatientEvidence } from "@/components/payments/payment-patient-evidence";
import {
  ListPagination,
} from "@/components/ui/list-pagination";
import type { ListPaginationMeta } from "@/lib/pagination";
import type {
  AdminPendingPaymentItem,
  AdminPaymentsView,
} from "@/server/actions/payment-admin.queries";
import {
  approveAppointmentAdvance,
  approveAppointmentRemainder,
  approveResourcePayment,
  approveProductPayment,
  permanentlyDeletePaymentInboxItem,
  rejectAppointmentPayment,
  rejectResourcePayment,
  rejectProductPayment,
  restorePaymentInboxItem,
  trashPaymentInboxItem,
} from "@/server/actions/payment-admin.actions";

const BASE_PATH = "/dashboard/admin/payments";

const kindLabels: Record<AdminPendingPaymentItem["kind"], string> = {
  RESOURCE: "Recurso",
  PRODUCT: "Producto",
  APPOINTMENT_ADVANCE: "Pago de cita",
  APPOINTMENT_REMAINDER: "Saldo de cita",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tabHref(view: AdminPaymentsView, query: string) {
  const sp = new URLSearchParams();
  if (view === "trash") sp.set("view", "trash");
  if (query.trim()) sp.set("q", query.trim());
  const qs = sp.toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
}

export function AdminPaymentsPanel({
  items,
  pagination,
  trashCount,
  view,
  initialQuery,
}: {
  items: AdminPendingPaymentItem[];
  pagination: ListPaginationMeta;
  trashCount: number;
  view: AdminPaymentsView;
  initialQuery: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const isTrash = view === "trash";

  const listParams = {
    view: isTrash ? "trash" : undefined,
    q: initialQuery || undefined,
  };

  function runAction(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else alert(res.message ?? "No se pudo completar la acción.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href={tabHref("active", initialQuery)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            !isTrash
              ? "bg-primary text-primary-foreground"
              : "border border-foreground/15 text-foreground/70 hover:bg-muted/50"
          }`}
        >
          Bandeja
          {!isTrash && pagination.total > 0 && (
            <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {pagination.total}
            </span>
          )}
        </Link>
        <Link
          href={tabHref("trash", initialQuery)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            isTrash
              ? "bg-primary text-primary-foreground"
              : "border border-foreground/15 text-foreground/70 hover:bg-muted/50"
          }`}
        >
          Papelera
          {trashCount > 0 && (
            <span
              className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${
                isTrash ? "bg-white/20" : "bg-foreground/10"
              }`}
            >
              {trashCount}
            </span>
          )}
        </Link>
      </div>

      <form
        method="get"
        action={BASE_PATH}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {isTrash && <input type="hidden" name="view" value="trash" />}
        <input
          type="search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Buscar por paciente, email o ítem..."
          className="min-w-0 flex-1 rounded-full border border-foreground/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-semibold hover:bg-muted/50"
        >
          Buscar
        </button>
      </form>

      <ListPagination
        basePath={BASE_PATH}
        meta={pagination}
        params={listParams}
      />

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-foreground/15 bg-white px-6 py-12 text-center text-sm text-foreground/50">
          {isTrash
            ? initialQuery
              ? "Ningún resultado en la papelera."
              : "La papelera está vacía."
            : initialQuery
              ? "Ningún resultado coincide con tu búsqueda."
              : "No hay pagos pendientes por revisar."}
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                isTrash
                  ? "border-foreground/15 opacity-90"
                  : "border-foreground/10"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {kindLabels[item.kind]}
                    </span>
                    {isTrash && item.trashedAt && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/45">
                        En papelera · {fmt(item.trashedAt)}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                  <p className="text-sm text-foreground/60">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/45">
                    {item.totalAmount ? "Cuota a pagar" : "Monto"}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    <DisplayPrice amount={item.amount} currency="ARS" />
                  </p>
                  {item.totalAmount ? (
                    <p className="mt-1 text-xs text-foreground/50">
                      Total de la cita:{" "}
                      <DisplayPrice amount={item.totalAmount} currency="ARS" />
                    </p>
                  ) : null}
                  <p className="text-xs text-foreground/45">
                    {fmt(item.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground/45">
                    Paciente
                  </p>
                  <p className="mt-1 font-semibold">{item.patientName}</p>
                  <p className="text-foreground/60">{item.patientEmail}</p>
                  <Link
                    href={`/dashboard/admin/patients/${item.patientId}`}
                    className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
                  >
                    Ver ficha →
                  </Link>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground/45">
                    Datos del pago (paciente)
                  </p>
                  <div className="mt-2">
                    <PaymentPatientEvidence
                      paymentMethod={item.paymentMethod}
                      patientReference={item.patientReference}
                      patientNote={item.patientNote}
                      proofUrls={item.proofUrls}
                    />
                  </div>
                </div>
              </div>

              {!isTrash && (
                <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <label className="block text-sm">
                    <span className="font-bold text-primary">
                      Nota interna (admin)
                    </span>
                    <textarea
                      value={notes[item.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Observaciones privadas para tu registro…"
                      className="mt-2 w-full rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {isTrash ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => restorePaymentInboxItem(item.id))
                      }
                      className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Restaurar
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          !confirm(
                            "¿Eliminar permanentemente? Ya no aparecerá en la bandeja ni en la papelera.",
                          )
                        ) {
                          return;
                        }
                        runAction(() =>
                          permanentlyDeletePaymentInboxItem(item.id),
                        );
                      }}
                      className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Eliminar permanentemente
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const note = notes[item.id]?.trim() || undefined;
                        if (item.kind === "RESOURCE" && item.purchaseId) {
                          runAction(() =>
                            approveResourcePayment({
                              purchaseId: item.purchaseId!,
                              adminNote: note,
                            }),
                          );
                        } else if (item.kind === "PRODUCT" && item.purchaseId) {
                          runAction(() =>
                            approveProductPayment({
                              purchaseId: item.purchaseId!,
                              adminNote: note,
                            }),
                          );
                        } else if (
                          item.kind === "APPOINTMENT_ADVANCE" &&
                          item.appointmentId
                        ) {
                          runAction(() =>
                            approveAppointmentAdvance({
                              appointmentId: item.appointmentId!,
                              adminNote: note,
                            }),
                          );
                        } else if (
                          item.kind === "APPOINTMENT_REMAINDER" &&
                          item.appointmentId
                        ) {
                          runAction(() =>
                            approveAppointmentRemainder({
                              appointmentId: item.appointmentId!,
                              adminNote: note,
                            }),
                          );
                        }
                      }}
                      className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Aprobar pago
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          !confirm(
                            "¿Rechazar este pago? El paciente deberá volver a solicitar si aplica.",
                          )
                        ) {
                          return;
                        }
                        if (item.kind === "RESOURCE" && item.purchaseId) {
                          runAction(() =>
                            rejectResourcePayment(item.purchaseId!),
                          );
                        } else if (item.kind === "PRODUCT" && item.purchaseId) {
                          runAction(() =>
                            rejectProductPayment(item.purchaseId!),
                          );
                        } else if (item.appointmentId) {
                          runAction(() =>
                            rejectAppointmentPayment(item.appointmentId!),
                          );
                        }
                      }}
                      className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          !confirm(
                            "¿Mover a la papelera? Podrás restaurarlo después.",
                          )
                        ) {
                          return;
                        }
                        runAction(() => trashPaymentInboxItem(item.id));
                      }}
                      className="rounded-full border border-foreground/15 px-5 py-2 text-sm font-semibold text-foreground/70 hover:bg-muted/50 disabled:opacity-50"
                    >
                      Mover a papelera
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ListPagination
        basePath={BASE_PATH}
        meta={pagination}
        params={listParams}
        className="pt-2"
      />
    </div>
  );
}
