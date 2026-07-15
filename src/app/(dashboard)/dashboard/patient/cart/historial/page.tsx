import { Suspense } from "react";
import { BrandDashboardHeader } from "@/components/brand/brand-dashboard-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PatientOrderHistory } from "@/components/cart/patient-order-history";
import {
  getMyPendingPayments,
  getMyProgressPurchases,
} from "@/server/actions/patient-progress.queries";

export const dynamic = "force-dynamic";

export default async function PatientCartHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const params = await searchParams;
  const [purchases, pendingPayments] = await Promise.all([
    getMyProgressPurchases(),
    getMyPendingPayments(),
  ]);

  return (
    <DashboardPage className="space-y-8">
      <BrandDashboardHeader
        eyebrow="Tu pedido"
        title="Historial de compras"
        description="Revisá lo comprado, lo que está en proceso y lo cancelado."
        action={{
          href: "/dashboard/patient/cart",
          label: "Ir al carrito",
        }}
      />

      {params.pedido === "ok" && (
        <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground/75">
          Pedido confirmado. Tu pago quedó en proceso hasta que Anttova lo
          verifique.
        </p>
      )}

      <Suspense fallback={<p className="text-sm text-foreground/50">Cargando…</p>}>
        <PatientOrderHistory
          purchases={purchases}
          pendingPayments={pendingPayments}
        />
      </Suspense>
    </DashboardPage>
  );
}
