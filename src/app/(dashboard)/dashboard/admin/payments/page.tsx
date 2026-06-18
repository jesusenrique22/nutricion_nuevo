import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { AdminPaymentsPanel } from "@/components/admin/admin-payments-panel";
import { AdminRefundRequestsPanel } from "@/components/admin/admin-refund-requests-panel";
import { formatActionError } from "@/lib/db-errors";
import { getAdminPaymentsInbox } from "@/server/actions/payment-admin.queries";
import { getAdminRefundRequests } from "@/server/actions/patient-progress.queries";
import type { AdminPaymentsView } from "@/server/actions/payment-admin.queries";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const emptyInbox = {
  items: [] as Awaited<ReturnType<typeof getAdminPaymentsInbox>>["items"],
  pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
  trashCount: 0,
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const view: AdminPaymentsView = sp.view === "trash" ? "trash" : "active";
  const page = Math.max(1, Number(sp.page) || 1);
  const query = sp.q?.trim() ?? "";

  let loadError: string | null = null;
  let inbox = emptyInbox;
  let refundRequests: Awaited<ReturnType<typeof getAdminRefundRequests>> = [];

  try {
    [inbox, refundRequests] = await Promise.all([
      getAdminPaymentsInbox({ view, page, query }),
      getAdminRefundRequests(),
    ]);
  } catch (err) {
    console.error("[admin/payments]", err);
    loadError = formatActionError(
      err,
      "No se pudo cargar la bandeja de pagos. Revisá la base de datos y las migraciones.",
    );
  }

  return (
    <ContentLobbyShell
      title="Pagos y reembolsos"
      description="Revisa comprobantes de pago y resuelve solicitudes de reembolso de pacientes."
    >
      {loadError && (
        <p
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {loadError}
        </p>
      )}

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
