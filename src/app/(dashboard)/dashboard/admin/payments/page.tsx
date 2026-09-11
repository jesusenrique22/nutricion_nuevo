import { ContentLobbyShell } from "@/components/brand/content-lobby-shell";
import { AdminPaymentsPanel } from "@/components/admin/admin-payments-panel";
import { AdminRefundRequestsPanel } from "@/components/admin/admin-refund-requests-panel";
import { formatActionError } from "@/lib/db-errors";
import {
  getAdminPaymentsHistory,
  getAdminPaymentsInbox,
} from "@/server/actions/payment-admin.queries";
import { getAdminRefundRequests } from "@/server/actions/patient-progress.queries";
import type { AdminPaymentsView } from "@/server/actions/payment-admin.queries";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const emptyInbox = {
  items: [] as Awaited<ReturnType<typeof getAdminPaymentsInbox>>["items"],
  pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
  trashCount: 0,
};

const emptyHistory = {
  items: [] as Awaited<ReturnType<typeof getAdminPaymentsHistory>>["items"],
  pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
};

function parseView(raw: string | undefined): AdminPaymentsView {
  if (raw === "trash") return "trash";
  if (raw === "history") return "history";
  return "active";
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const page = Math.max(1, Number(sp.page) || 1);
  const query = sp.q?.trim() ?? "";
  const isHistory = view === "history";

  let loadError: string | null = null;
  let inbox = emptyInbox;
  let history = emptyHistory;
  let refundRequests: Awaited<ReturnType<typeof getAdminRefundRequests>> = [];

  try {
    const [inboxResult, historyResult, refunds] = await Promise.all([
      isHistory
        ? getAdminPaymentsInbox({ view: "active", page: 1, pageSize: 1 })
        : getAdminPaymentsInbox({ view, page, query }),
      isHistory
        ? getAdminPaymentsHistory({ page, query })
        : getAdminPaymentsHistory({ page: 1, pageSize: 1 }),
      getAdminRefundRequests(),
    ]);
    inbox = isHistory
      ? { ...emptyInbox, trashCount: inboxResult.trashCount }
      : inboxResult;
    history = historyResult;
    refundRequests = refunds;
  } catch (err) {
    console.error("[admin/payments]", err);
    loadError = formatActionError(
      err,
      "No se pudo cargar la bandeja de pagos. Revisá la base de datos y las migraciones.",
    );
  }

  const panelPagination = isHistory ? history.pagination : inbox.pagination;

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
          {isHistory
            ? "Historial de pagos confirmados"
            : "Pagos pendientes de verificación"}
        </h2>
        <AdminPaymentsPanel
          items={inbox.items}
          historyItems={history.items}
          pagination={panelPagination}
          trashCount={inbox.trashCount}
          historyCount={history.pagination.total}
          view={view}
          initialQuery={query}
        />
      </section>
    </ContentLobbyShell>
  );
}
