"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PatientPendingPaymentsPanel } from "@/components/progress/patient-pending-payments-panel";
import { PatientPurchasesPanel } from "@/components/progress/patient-purchases-panel";
import { getOrderHistoryBucket } from "@/lib/patient-progress";
import {
  filterDuplicateProcessingProgress,
  uniqueProcessingCount,
} from "@/lib/order-history-processing";
import type { PatientPendingPaymentItem } from "@/server/actions/patient-progress.queries";
import type { PatientProgressItem } from "@/server/actions/patient-progress.queries";

type TabId = "purchased" | "processing" | "cancelled";

const TABS: { id: TabId; label: string; hint: string }[] = [
  {
    id: "purchased",
    label: "Comprado",
    hint: "Compras y citas confirmadas con acceso o pago aprobado.",
  },
  {
    id: "processing",
    label: "En proceso",
    hint: "Esperando confirmación del pago por parte de Anttova.",
  },
  {
    id: "cancelled",
    label: "Cancelado",
    hint: "Citas canceladas, reembolsos u órdenes no concretadas.",
  },
];

function tabHref(tab: TabId) {
  return `/dashboard/patient/cart/historial?tab=${tab}`;
}

export function PatientOrderHistory({
  purchases,
  pendingPayments,
}: {
  purchases: PatientProgressItem[];
  pendingPayments: PatientPendingPaymentItem[];
}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const active: TabId =
    raw === "processing" || raw === "cancelled" || raw === "purchased"
      ? raw
      : "purchased";

  const buckets = useMemo(() => {
    const purchased: PatientProgressItem[] = [];
    const processing: PatientProgressItem[] = [];
    const cancelled: PatientProgressItem[] = [];
    for (const item of purchases) {
      const bucket = getOrderHistoryBucket(item);
      if (bucket === "purchased") purchased.push(item);
      else if (bucket === "processing") processing.push(item);
      else cancelled.push(item);
    }
    return { purchased, processing, cancelled };
  }, [purchases]);

  const processingProgressOnly = useMemo(
    () => filterDuplicateProcessingProgress(buckets.processing, pendingPayments),
    [buckets.processing, pendingPayments],
  );

  const counts = {
    purchased: buckets.purchased.length,
    processing: uniqueProcessingCount(buckets.processing, pendingPayments),
    cancelled: buckets.cancelled.length,
  };

  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0]!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "border border-foreground/15 text-foreground/70 hover:bg-muted/50"
              }`}
            >
              {tab.label}
              {counts[tab.id] > 0 ? (
                <span className="ml-1.5 text-xs opacity-80">
                  ({counts[tab.id]})
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-foreground/60">{activeTab.hint}</p>

      {active === "processing" ? (
        <div className="space-y-8">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
              Pagos por confirmar
            </h2>
            <div className="mt-4">
              <PatientPendingPaymentsPanel items={pendingPayments} />
            </div>
          </section>
          {processingProgressOnly.length > 0 ? (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-foreground/50">
                Otras órdenes en proceso
              </h2>
              <div className="mt-4">
                <PatientPurchasesPanel items={processingProgressOnly} />
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <PatientPurchasesPanel
          items={
            active === "cancelled" ? buckets.cancelled : buckets.purchased
          }
        />
      )}

      <Link
        href="/dashboard/patient/cart"
        className="inline-flex text-sm font-semibold text-primary hover:underline"
      >
        ← Volver al carrito
      </Link>
    </div>
  );
}
