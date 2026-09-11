"use server";

import { auth } from "@/lib/auth";
import { paymentMethodLabel, type PaymentMethodId } from "@/lib/payment-methods";
import { parseProofUrls } from "@/lib/payment-checkout-policy";
import { prisma } from "@/server/db/prisma";
import { isTwoPhaseSplit } from "@/lib/payment-policy-resolve";
import { toPaymentPhaseView } from "@/lib/payment-split";
import { getPaymentQuerySelect } from "@/lib/payment-query-select";
import { DEFAULT_PAGE_SIZE, type ListPaginationMeta } from "@/lib/pagination";

export type AdminPaymentKind =
  | "RESOURCE"
  | "PRODUCT"
  | "APPOINTMENT_ADVANCE"
  | "APPOINTMENT_REMAINDER";

export type AdminPaymentsView = "active" | "trash" | "history";

export interface AdminPaidPaymentItem {
  id: string;
  kind: AdminPaymentKind;
  patientId: string;
  patientName: string;
  patientEmail: string;
  title: string;
  subtitle: string;
  amount: string;
  totalAmount?: string | null;
  paidAt: string;
  adminNote?: string | null;
  resourceId?: string;
  purchaseId?: string;
  appointmentId?: string;
  paymentMethod?: string | null;
  patientReference?: string | null;
  patientNote?: string | null;
  proofUrls?: string[];
}

export interface AdminPendingPaymentItem {
  id: string;
  kind: AdminPaymentKind;
  patientId: string;
  patientName: string;
  patientEmail: string;
  title: string;
  subtitle: string;
  /** Monto de esta cuota / ítem pendiente. */
  amount: string;
  /** Precio total de la cita (solo pagos de citas en etapas). */
  totalAmount?: string | null;
  createdAt: string;
  trashedAt?: string | null;
  resourceId?: string;
  purchaseId?: string;
  appointmentId?: string;
  paymentMethod?: string | null;
  patientReference?: string | null;
  patientNote?: string | null;
  proofUrls?: string[];
  /** Adelanto ya confirmado (citas en 2 cuotas). */
  paidAdvanceAmount?: string | null;
  appointmentStart?: string | null;
  /** Saldo sin comprobante del paciente — solo informativo. */
  awaitingPatientPayment?: boolean;
}

export interface AdminPaymentsInboxResult {
  items: AdminPendingPaymentItem[];
  pagination: ListPaginationMeta;
  trashCount: number;
}

function mapPaymentMethod(method: string | null | undefined): string | null {
  if (!method) return null;
  if (method === "zelle" || method === "mercado_pago") {
    return paymentMethodLabel(method as PaymentMethodId);
  }
  return method;
}

function appointmentPatientPaymentMeta(payment: {
  patientPaymentMethod: string | null;
  patientPaymentReference: string | null;
  patientPaymentNote: string | null;
  patientPaymentProofUrls: unknown;
}) {
  return {
    paymentMethod: mapPaymentMethod(payment.patientPaymentMethod),
    patientReference: payment.patientPaymentReference,
    patientNote: payment.patientPaymentNote,
    proofUrls: parseProofUrls(payment.patientPaymentProofUrls),
  };
}

function appointmentRemainderPaymentMeta(payment: {
  remainderPatientPaymentMethod?: string | null;
  remainderPatientPaymentReference?: string | null;
  remainderPatientPaymentNote?: string | null;
  remainderPatientPaymentProofUrls?: unknown;
}) {
  return {
    paymentMethod: mapPaymentMethod(payment.remainderPatientPaymentMethod),
    patientReference: payment.remainderPatientPaymentReference,
    patientNote: payment.remainderPatientPaymentNote,
    proofUrls: parseProofUrls(payment.remainderPatientPaymentProofUrls),
  };
}

function matchesPaymentQuery(
  item: {
    patientName: string;
    patientEmail: string;
    title: string;
    subtitle: string;
    patientReference?: string | null;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.patientName.toLowerCase().includes(q) ||
    item.patientEmail.toLowerCase().includes(q) ||
    item.title.toLowerCase().includes(q) ||
    item.subtitle.toLowerCase().includes(q) ||
    (item.patientReference?.toLowerCase().includes(q) ?? false)
  );
}

async function loadRawInboxItems(): Promise<AdminPendingPaymentItem[]> {
  const paymentSelect = await getPaymentQuerySelect();

  const [resourceRows, productRows, appointmentRows] = await Promise.all([
    prisma.resourcePurchase.findMany({
      where: {
        status: "PENDING",
        inboxDismissedAt: null,
      },
      include: { user: true, resource: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productPurchase.findMany({
      where: {
        status: "PENDING",
        inboxDismissedAt: null,
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appointment.findMany({
      where: {
        payment: {
          status: { not: "REFUNDED" },
          OR: [
            {
              advanceStatus: "PENDING",
              advanceInboxDismissedAt: null,
            },
            {
              advanceStatus: "PAID",
              remainderStatus: "PENDING",
              remainderInboxDismissedAt: null,
              remainderAmount: { gt: 0 },
            },
          ],
        },
      },
      include: {
        patient: true,
        consultationType: true,
        payment: { select: paymentSelect },
      },
      orderBy: { startTime: "desc" },
    }),
  ]);

  const items: AdminPendingPaymentItem[] = [];

  for (const row of resourceRows) {
    items.push({
      id: `resource-${row.id}`,
      kind: "RESOURCE",
      patientId: row.userId,
      patientName: row.user.name,
      patientEmail: row.user.email,
      title: row.resource.title,
      subtitle: `Recurso · ${row.resource.type}`,
      amount: row.pricePaid.toString(),
      createdAt: row.createdAt.toISOString(),
      trashedAt: row.inboxTrashedAt?.toISOString() ?? null,
      resourceId: row.resourceId,
      purchaseId: row.id,
      paymentMethod: mapPaymentMethod(row.patientPaymentMethod),
      patientReference: row.patientPaymentReference,
      patientNote: row.patientPaymentNote,
      proofUrls: parseProofUrls(row.patientPaymentProofUrls),
    });
  }

  for (const row of productRows) {
    items.push({
      id: `product-${row.id}`,
      kind: "PRODUCT",
      patientId: row.userId,
      patientName: row.user.name,
      patientEmail: row.user.email,
      title: row.productName,
      subtitle:
        (row.quantity ?? 1) > 1
          ? `Producto · ${row.quantity} uds.`
          : "Producto",
      amount: row.pricePaid.toString(),
      createdAt: row.createdAt.toISOString(),
      trashedAt: row.inboxTrashedAt?.toISOString() ?? null,
      purchaseId: row.id,
      paymentMethod: mapPaymentMethod(row.patientPaymentMethod),
      patientReference: row.patientPaymentReference,
      patientNote: row.patientPaymentNote,
      proofUrls: parseProofUrls(row.patientPaymentProofUrls),
    });
  }

  for (const appt of appointmentRows) {
    if (!appt.payment) continue;
    const payment = appt.payment;
    const phases = toPaymentPhaseView(payment);

    const dateLabel = new Date(appt.startTime).toLocaleString("es", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    const advancePending =
      phases.advanceStatus === "PENDING" &&
      Number(phases.advanceAmount) > 0 &&
      !payment.advanceInboxDismissedAt;

    if (advancePending) {
      items.push({
        id: `appt-advance-${appt.id}`,
        kind: "APPOINTMENT_ADVANCE",
        patientId: appt.patientId,
        patientName: appt.patient.name,
        patientEmail: appt.patient.email,
        title: appt.consultationType.name,
        subtitle: `Adelanto · Cita ${dateLabel}`,
        amount: phases.advanceAmount,
        totalAmount: payment.amount.toString(),
        createdAt: appt.createdAt.toISOString(),
        trashedAt: payment.advanceInboxTrashedAt?.toISOString() ?? null,
        appointmentId: appt.id,
        ...appointmentPatientPaymentMeta(payment),
      });
    }

    const remainderPending =
      isTwoPhaseSplit(phases.advancePercent) &&
      phases.advanceStatus === "PAID" &&
      phases.remainderStatus === "PENDING" &&
      Number(phases.remainderAmount) > 0 &&
      !payment.remainderInboxDismissedAt;

    if (remainderPending) {
      const remainderMeta = appointmentRemainderPaymentMeta(payment);
      const hasProof = remainderMeta.proofUrls.length > 0;

      items.push({
        id: `appt-remainder-${appt.id}`,
        kind: "APPOINTMENT_REMAINDER",
        patientId: appt.patientId,
        patientName: appt.patient.name,
        patientEmail: appt.patient.email,
        title: appt.consultationType.name,
        subtitle: hasProof
          ? `Saldo en revisión · Cita ${dateLabel}`
          : `Adelanto confirmado · falta saldo · Cita ${dateLabel}`,
        amount: phases.remainderAmount,
        totalAmount: payment.amount.toString(),
        paidAdvanceAmount: phases.advanceAmount,
        appointmentStart: appt.startTime.toISOString(),
        awaitingPatientPayment: !hasProof,
        createdAt:
          ("remainderSubmittedAt" in payment
            ? payment.remainderSubmittedAt?.toISOString()
            : null) ??
          payment.advancePaidAt?.toISOString() ??
          appt.createdAt.toISOString(),
        trashedAt: payment.remainderInboxTrashedAt?.toISOString() ?? null,
        appointmentId: appt.id,
        ...(hasProof
          ? remainderMeta
          : {
              paymentMethod: null,
              patientReference: null,
              patientNote: null,
              proofUrls: [] as string[],
            }),
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function loadPaidHistoryItems(): Promise<AdminPaidPaymentItem[]> {
  const paymentSelect = await getPaymentQuerySelect();

  const [resourceRows, productRows, appointmentRows] = await Promise.all([
    prisma.resourcePurchase.findMany({
      where: { status: "GRANTED" },
      include: { user: true, resource: true },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.productPurchase.findMany({
      where: { status: "GRANTED" },
      include: { user: true },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.appointment.findMany({
      where: {
        payment: {
          OR: [
            { advanceStatus: "PAID", advancePaidAt: { not: null } },
            { remainderStatus: "PAID", remainderPaidAt: { not: null } },
          ],
        },
      },
      include: {
        patient: true,
        consultationType: true,
        payment: { select: paymentSelect },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const items: AdminPaidPaymentItem[] = [];

  for (const row of resourceRows) {
    if (!row.grantedAt) continue;
    items.push({
      id: `history-resource-${row.id}`,
      kind: "RESOURCE",
      patientId: row.userId,
      patientName: row.user.name,
      patientEmail: row.user.email,
      title: row.resource.title,
      subtitle: `Recurso · ${row.resource.type}`,
      amount: row.pricePaid.toString(),
      paidAt: row.grantedAt.toISOString(),
      adminNote: row.adminNote,
      resourceId: row.resourceId,
      purchaseId: row.id,
      paymentMethod: mapPaymentMethod(row.patientPaymentMethod),
      patientReference: row.patientPaymentReference,
      patientNote: row.patientPaymentNote,
      proofUrls: parseProofUrls(row.patientPaymentProofUrls),
    });
  }

  for (const row of productRows) {
    if (!row.grantedAt) continue;
    items.push({
      id: `history-product-${row.id}`,
      kind: "PRODUCT",
      patientId: row.userId,
      patientName: row.user.name,
      patientEmail: row.user.email,
      title: row.productName,
      subtitle:
        (row.quantity ?? 1) > 1
          ? `Producto · ${row.quantity} uds.`
          : "Producto",
      amount: row.pricePaid.toString(),
      paidAt: row.grantedAt.toISOString(),
      adminNote: row.adminNote,
      purchaseId: row.id,
      paymentMethod: mapPaymentMethod(row.patientPaymentMethod),
      patientReference: row.patientPaymentReference,
      patientNote: row.patientPaymentNote,
      proofUrls: parseProofUrls(row.patientPaymentProofUrls),
    });
  }

  for (const appt of appointmentRows) {
    if (!appt.payment) continue;
    const payment = appt.payment;
    const phases = toPaymentPhaseView(payment);

    const dateLabel = new Date(appt.startTime).toLocaleString("es", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (
      phases.advanceStatus === "PAID" &&
      payment.advancePaidAt &&
      Number(phases.advanceAmount) > 0
    ) {
      items.push({
        id: `history-appt-advance-${appt.id}`,
        kind: "APPOINTMENT_ADVANCE",
        patientId: appt.patientId,
        patientName: appt.patient.name,
        patientEmail: appt.patient.email,
        title: appt.consultationType.name,
        subtitle: `Adelanto confirmado · Cita ${dateLabel}`,
        amount: phases.advanceAmount,
        totalAmount: payment.amount.toString(),
        paidAt: payment.advancePaidAt.toISOString(),
        adminNote: payment.advanceNote ?? payment.adminNote,
        appointmentId: appt.id,
        ...appointmentPatientPaymentMeta(payment),
      });
    }

    if (
      phases.remainderStatus === "PAID" &&
      payment.remainderPaidAt &&
      Number(phases.remainderAmount) > 0
    ) {
      const remainderMeta = appointmentRemainderPaymentMeta(payment);
      const hasRemainderProof = remainderMeta.proofUrls.length > 0;

      items.push({
        id: `history-appt-remainder-${appt.id}`,
        kind: "APPOINTMENT_REMAINDER",
        patientId: appt.patientId,
        patientName: appt.patient.name,
        patientEmail: appt.patient.email,
        title: appt.consultationType.name,
        subtitle: `Saldo confirmado · Cita ${dateLabel}`,
        amount: phases.remainderAmount,
        totalAmount: payment.amount.toString(),
        paidAt: payment.remainderPaidAt.toISOString(),
        adminNote: payment.remainderNote ?? payment.adminNote,
        appointmentId: appt.id,
        ...(hasRemainderProof
          ? remainderMeta
          : appointmentPatientPaymentMeta(payment)),
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );
}

export interface AdminPaymentsHistoryResult {
  items: AdminPaidPaymentItem[];
  pagination: ListPaginationMeta;
}

export async function getAdminPaymentsHistory(params?: {
  page?: number;
  pageSize?: number;
  query?: string;
}): Promise<AdminPaymentsHistoryResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return {
      items: [],
      pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    };
  }

  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = params?.query ?? "";
  const all = await loadPaidHistoryItems();
  const filtered = all.filter((item) => matchesPaymentQuery(item, query));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(params?.page ?? 1, 1), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    pagination: { page, pageSize, total, totalPages },
  };
}

export async function getAdminPaymentsInbox(params?: {
  view?: AdminPaymentsView;
  page?: number;
  pageSize?: number;
  query?: string;
}): Promise<AdminPaymentsInboxResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return {
      items: [],
      pagination: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
      trashCount: 0,
    };
  }

  const view = params?.view ?? "active";
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const query = params?.query ?? "";

  const all = await loadRawInboxItems();
  const active = all.filter((item) => !item.trashedAt);
  const trash = all.filter((item) => Boolean(item.trashedAt));
  const pool = view === "trash" ? trash : active;
  const filtered = pool.filter((item) => matchesPaymentQuery(item, query));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(params?.page ?? 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    pagination: { page, pageSize, total, totalPages },
    trashCount: trash.length,
  };
}

/** Todos los pagos activos (sin papelera) — compatibilidad con ficha paciente. */
export async function getAdminPendingPayments(): Promise<
  AdminPendingPaymentItem[]
> {
  const result = await getAdminPaymentsInbox({
    view: "active",
    page: 1,
    pageSize: 10_000,
  });
  return result.items;
}

/** Pagos pendientes de un paciente (solo ADMIN, sin papelera). */
export async function getPatientPendingPayments(
  patientId: string,
): Promise<AdminPendingPaymentItem[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const items = await getAdminPendingPayments();
  return items.filter((item) => item.patientId === patientId);
}

export async function getAdminPendingPaymentsCount(): Promise<number> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return 0;

  const all = await loadRawInboxItems();
  return all.filter((item) => !item.trashedAt).length;
}
