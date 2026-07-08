"use server";

import { auth } from "@/lib/auth";
import { paymentMethodLabel, type PaymentMethodId } from "@/lib/payment-methods";
import { parseProofUrls } from "@/lib/payment-checkout-policy";
import { prisma } from "@/server/db/prisma";
import { toPaymentPhaseView } from "@/lib/payment-split";

export type PatientProgressItemKind = "APPOINTMENT" | "RESOURCE";

export interface PatientProgressItem {
  id: string;
  kind: PatientProgressItemKind;
  entityId: string;
  title: string;
  subtitle: string;
  amount: string;
  purchasedAt: string;
  statusLabel: string;
  paymentStatus: string;
  refundStatus: "NONE" | "REQUESTED" | "APPROVED" | "DENIED";
  refundAdminNote: string | null;
  canRequestRefund: boolean;
}

function fmtDate(iso: Date | string) {
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resourceStatusLabel(status: string, refundStatus: string): string {
  if (refundStatus === "REQUESTED") return "Reembolso en revisión";
  if (refundStatus === "APPROVED" || status === "REFUNDED") return "Reembolsado";
  if (refundStatus === "DENIED") return "Reembolso no aceptado";
  if (status === "PENDING") return "Pago en revisión";
  if (status === "GRANTED") return "Acceso activo";
  return status;
}

function appointmentStatusLabel(
  paymentStatus: string,
  refundStatus: string,
  appointmentStatus: string,
): string {
  if (refundStatus === "REQUESTED") return "Reembolso en revisión";
  if (refundStatus === "APPROVED" || paymentStatus === "REFUNDED") {
    return "Reembolsado";
  }
  if (refundStatus === "DENIED") return "Reembolso no aceptado";
  if (paymentStatus === "PENDING") return "Pago en revisión";
  if (paymentStatus === "PARTIAL") return "Adelanto en revisión";
  if (paymentStatus === "PAID") return "Pagado";
  if (appointmentStatus === "CONFIRMED") return "Cita confirmada";
  if (appointmentStatus === "COMPLETED") return "Consulta completada";
  return "Cita agendada";
}

/** Compras y citas pagadas del paciente para Mi progreso. */
export async function getMyProgressPurchases(): Promise<PatientProgressItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const [appointments, purchases] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patientId: session.user.id,
        payment: { isNot: null },
        OR: [
          { status: { not: "CANCELLED" } },
          { payment: { status: "REFUNDED" } },
          {
            payment: {
              refundStatus: { in: ["REQUESTED", "APPROVED", "DENIED"] },
            },
          },
        ],
      },
      include: { consultationType: true, payment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.resourcePurchase.findMany({
      where: {
        userId: session.user.id,
        pricePaid: { gt: 0 },
      },
      include: { resource: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: PatientProgressItem[] = [];

  for (const appt of appointments) {
    if (!appt.payment) continue;
    const phases = toPaymentPhaseView(appt.payment);
    const paymentStatus = phases.overallStatus;
    const refundStatus = appt.payment.refundStatus;

    items.push({
      id: `appt-${appt.id}`,
      kind: "APPOINTMENT",
      entityId: appt.id,
      title: appt.consultationType.name,
      subtitle: fmtDate(appt.startTime),
      amount: appt.consultationType.price.toString(),
      purchasedAt: appt.createdAt.toISOString(),
      statusLabel: appointmentStatusLabel(
        paymentStatus,
        refundStatus,
        appt.status,
      ),
      paymentStatus,
      refundStatus,
      refundAdminNote: appt.payment.refundAdminNote,
      canRequestRefund:
        refundStatus === "NONE" &&
        paymentStatus !== "REFUNDED" &&
        appt.status !== "CANCELLED",
    });
  }

  for (const row of purchases) {
    items.push({
      id: `resource-${row.id}`,
      kind: "RESOURCE",
      entityId: row.id,
      title: row.resource.title,
      subtitle: row.resource.type,
      amount: row.pricePaid.toString(),
      purchasedAt: row.createdAt.toISOString(),
      statusLabel: resourceStatusLabel(row.status, row.refundStatus),
      paymentStatus: row.status,
      refundStatus: row.refundStatus,
      refundAdminNote: row.refundAdminNote,
      canRequestRefund:
        row.refundStatus === "NONE" && row.status !== "REFUNDED",
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
  );

  return items;
}

export type PatientPendingPaymentKind =
  | "RESOURCE"
  | "APPOINTMENT_ADVANCE"
  | "APPOINTMENT_REMAINDER";

export interface PatientPendingPaymentItem {
  id: string;
  kind: PatientPendingPaymentKind;
  title: string;
  subtitle: string;
  amount: string;
  createdAt: string;
  paymentMethod: string | null;
  patientReference: string | null;
  patientNote: string | null;
  proofUrls: string[];
}

function mapPaymentMethod(method: string | null | undefined): string | null {
  if (!method) return null;
  if (method === "zelle" || method === "mercado_pago") {
    return paymentMethodLabel(method as PaymentMethodId);
  }
  return method;
}

/** Pagos en revisión del paciente autenticado. */
export async function getMyPendingPayments(): Promise<PatientPendingPaymentItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const patientId = session.user.id;

  const [resourceRows, appointmentRows] = await Promise.all([
    prisma.resourcePurchase.findMany({
      where: {
        userId: patientId,
        status: "PENDING",
        inboxDismissedAt: null,
      },
      include: { resource: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appointment.findMany({
      where: {
        patientId,
        payment: {
          OR: [
            {
              advanceStatus: "PENDING",
              advanceInboxDismissedAt: null,
            },
            {
              remainderStatus: "PENDING",
              remainderInboxDismissedAt: null,
            },
          ],
        },
      },
      include: { consultationType: true, payment: true },
      orderBy: { startTime: "desc" },
    }),
  ]);

  const items: PatientPendingPaymentItem[] = [];

  for (const row of resourceRows) {
    items.push({
      id: `resource-${row.id}`,
      kind: "RESOURCE",
      title: row.resource.title,
      subtitle: `Recurso · ${row.resource.type}`,
      amount: row.pricePaid.toString(),
      createdAt: row.createdAt.toISOString(),
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
      phases.advanceStatus === "PENDING" &&
      Number(phases.advanceAmount) > 0 &&
      !payment.advanceInboxDismissedAt
    ) {
      items.push({
        id: `appt-advance-${appt.id}`,
        kind: "APPOINTMENT_ADVANCE",
        title: appt.consultationType.name,
        subtitle: `Adelanto · Cita ${dateLabel}`,
        amount: phases.advanceAmount,
        createdAt: appt.createdAt.toISOString(),
        paymentMethod: mapPaymentMethod(payment.patientPaymentMethod),
        patientReference: payment.patientPaymentReference,
        patientNote: payment.patientPaymentNote,
        proofUrls: parseProofUrls(payment.patientPaymentProofUrls),
      });
    }

    if (
      phases.remainderStatus === "PENDING" &&
      Number(phases.remainderAmount) > 0 &&
      !payment.remainderInboxDismissedAt
    ) {
      items.push({
        id: `appt-remainder-${appt.id}`,
        kind: "APPOINTMENT_REMAINDER",
        title: appt.consultationType.name,
        subtitle: `Saldo final · Cita ${dateLabel}`,
        amount: phases.remainderAmount,
        createdAt: appt.createdAt.toISOString(),
        paymentMethod: mapPaymentMethod(payment.patientPaymentMethod),
        patientReference: payment.patientPaymentReference,
        patientNote: payment.patientPaymentNote,
        proofUrls: parseProofUrls(payment.patientPaymentProofUrls),
      });
    }
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return items;
}

export interface AdminRefundRequestItem {
  id: string;
  kind: PatientProgressItemKind;
  entityId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  title: string;
  subtitle: string;
  amount: string;
  requestedAt: string;
  patientNote: string | null;
}

export async function getAdminRefundRequests(): Promise<
  AdminRefundRequestItem[]
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const [appointmentRows, resourceRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { payment: { refundStatus: "REQUESTED" } },
      include: {
        patient: true,
        consultationType: true,
        payment: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.resourcePurchase.findMany({
      where: { refundStatus: "REQUESTED" },
      include: { user: true, resource: true },
      orderBy: { refundRequestedAt: "desc" },
    }),
  ]);

  const items: AdminRefundRequestItem[] = [];

  for (const appt of appointmentRows) {
    if (!appt.payment) continue;
    items.push({
      id: `appt-refund-${appt.id}`,
      kind: "APPOINTMENT",
      entityId: appt.id,
      patientId: appt.patientId,
      patientName: appt.patient.name,
      patientEmail: appt.patient.email,
      title: appt.consultationType.name,
      subtitle: fmtDate(appt.startTime),
      amount: appt.payment.amount.toString(),
      requestedAt:
        appt.payment.refundRequestedAt?.toISOString() ??
        appt.updatedAt.toISOString(),
      patientNote: appt.payment.refundPatientNote,
    });
  }

  for (const row of resourceRows) {
    items.push({
      id: `resource-refund-${row.id}`,
      kind: "RESOURCE",
      entityId: row.id,
      patientId: row.userId,
      patientName: row.user.name,
      patientEmail: row.user.email,
      title: row.resource.title,
      subtitle: row.resource.type,
      amount: row.pricePaid.toString(),
      requestedAt:
        row.refundRequestedAt?.toISOString() ?? row.createdAt.toISOString(),
      patientNote: row.refundPatientNote,
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );

  return items;
}
