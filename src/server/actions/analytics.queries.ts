"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";

/** Fila de una cita en los desplegables de "Próximas" y "Canceladas". */
export interface AnalyticsAppointmentRow {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  consultationName: string;
  startTime: string;
  modality: string;
  status: string;
  cancelledBy: "PATIENT" | "ADMIN" | null;
  cancelledAt: string | null;
}

/** Fila del desplegable de "Pagos pendientes". */
export interface AnalyticsPendingPaymentRow {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  consultationName: string;
  startTime: string;
  amount: string;
  pendingAmount: string;
  currency: string;
  /** Qué falta cobrar: la seña, el saldo, o el total. */
  phase: "ADVANCE" | "REMAINDER" | "FULL";
}

export interface AnalyticsSummary {
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowCount: number;
  pendingPayments: number;
  byConsultation: { code: string; name: string; count: number }[];
  byStatus: { status: string; count: number }[];
  monthlyAppointments: { month: string; count: number }[];
  /** Detalle desplegable de cada indicador accionable. */
  upcomingList: AnalyticsAppointmentRow[];
  cancelledList: AnalyticsAppointmentRow[];
  pendingPaymentsList: AnalyticsPendingPaymentRow[];
}

/** Tope por lista: el panel es para gestionar el día a día, no un export. */
const DETAIL_LIMIT = 50;

export async function getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowCount,
    pendingPayments,
    byType,
    byStatus,
    recentAppointments,
    upcomingRows,
    cancelledRows,
    pendingPaymentRows,
  ] = await Promise.all([
    prisma.appointment.count(),
    prisma.appointment.count({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gt: now },
      },
    }),
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.appointment.count({ where: { status: "CANCELLED" } }),
    prisma.appointment.count({ where: { status: "NO_SHOW" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.appointment.groupBy({
      by: ["consultationTypeId"],
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: { startTime: { gte: sixMonthsAgo } },
      select: { startTime: true },
    }),
    prisma.appointment.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gt: now },
      },
      include: { patient: true, consultationType: true },
      orderBy: { startTime: "asc" },
      take: DETAIL_LIMIT,
    }),
    prisma.appointment.findMany({
      where: { status: "CANCELLED" },
      include: { patient: true, consultationType: true },
      orderBy: { startTime: "desc" },
      take: DETAIL_LIMIT,
    }),
    prisma.payment.findMany({
      where: { status: "PENDING" },
      include: {
        appointment: {
          include: { patient: true, consultationType: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: DETAIL_LIMIT,
    }),
  ]);

  const typeIds = byType.map((t) => t.consultationTypeId);
  const types = await prisma.consultationType.findMany({
    where: { id: { in: typeIds } },
  });
  const typeMap = new Map(types.map((t) => [t.id, t]));

  const byConsultation = byType
    .map((t) => {
      const type = typeMap.get(t.consultationTypeId);
      return {
        code: type?.code ?? "?",
        name: type?.name ?? "Desconocido",
        count: t._count._all,
      };
    })
    .sort((a, b) => b.count - a.count);

  const monthCounts = new Map<string, number>();
  for (const a of recentAppointments) {
    const key = a.startTime.toLocaleString("es", {
      month: "short",
      year: "numeric",
    });
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }

  const monthlyAppointments = Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .slice(-6);

  const toAppointmentRow = (a: {
    id: string;
    patientId: string;
    patient: { name: string; email: string };
    consultationType: { name: string };
    startTime: Date;
    modality: string;
    status: string;
    cancelledBy: "PATIENT" | "ADMIN" | null;
    cancelledAt: Date | null;
  }): AnalyticsAppointmentRow => ({
    id: a.id,
    patientId: a.patientId,
    patientName: a.patient.name,
    patientEmail: a.patient.email,
    consultationName: a.consultationType.name,
    startTime: a.startTime.toISOString(),
    modality: a.modality,
    status: a.status,
    cancelledBy: a.cancelledBy,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
  });

  const pendingPaymentsList: AnalyticsPendingPaymentRow[] = pendingPaymentRows
    .filter((p) => p.appointment)
    .map((p) => {
      // Con cobro dividido, "pendiente" puede ser solo una de las dos partes.
      const advancePending = p.advanceStatus === "PENDING";
      const remainderPending = p.remainderStatus === "PENDING";
      const isSplit = p.remainderAmount.greaterThan(0);

      const phase: AnalyticsPendingPaymentRow["phase"] =
        !isSplit || (advancePending && remainderPending)
          ? "FULL"
          : advancePending
            ? "ADVANCE"
            : "REMAINDER";

      const pendingAmount =
        phase === "FULL"
          ? p.amount
          : phase === "ADVANCE"
            ? p.advanceAmount
            : p.remainderAmount;

      return {
        id: p.id,
        appointmentId: p.appointmentId,
        patientId: p.appointment.patientId,
        patientName: p.appointment.patient.name,
        patientEmail: p.appointment.patient.email,
        consultationName: p.appointment.consultationType.name,
        startTime: p.appointment.startTime.toISOString(),
        amount: p.amount.toString(),
        pendingAmount: pendingAmount.toString(),
        currency: p.currency,
        phase,
      };
    });

  return {
    upcomingList: upcomingRows.map(toAppointmentRow),
    cancelledList: cancelledRows.map(toAppointmentRow),
    pendingPaymentsList,
    totalAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowCount,
    pendingPayments,
    byConsultation,
    byStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count._all,
    })),
    monthlyAppointments,
  };
}
