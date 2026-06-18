import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { AdminPaymentsPanel } from "@/components/admin/admin-payments-panel";
import { AdminRefundRequestsPanel } from "@/components/admin/admin-refund-requests-panel";
import { getAdminPaymentsInbox } from "@/server/actions/payment-admin.queries";
import { getAdminRefundRequests } from "@/server/actions/patient-progress.queries";
import type { AdminPaymentsView } from "@/server/actions/payment-admin.queries";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const view: AdminPaymentsView = sp.view === "trash" ? "trash" : "active";
  const page = Math.max(1, Number(sp.page) || 1);
  const query = sp.q?.trim() ?? "";

  const [inbox, refundRequests] = await Promise.all([
    getAdminPaymentsInbox({ view, page, query }),
    getAdminRefundRequests(),
  ]);

  return (
    <ContentLobbyShell
      title="Pagos y reembolsos"
      description="Revisa comprobantes de pago y resuelve solicitudes de reembolso de pacientes."
    >
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
          Reembolsos solicitados
        </h2>
        <AdminRefundRequestsPanel items={refundRequests} />
      </section>

      <section className="space-y-4 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
          Pagos pendientes de verificación
        </h2>
        <AdminPaymentsPanel
          items={inbox.items}
          pagination={inbox.pagination}
          trashCount={inbox.trashCount}
          view={view}
          initialQuery={query}
        />
      </section>
    </ContentLobbyShell>
  );
}
