"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";

export interface AnalyticsSummary {
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowCount: number;
  totalRevenue: string;
  pendingPayments: number;
  byConsultation: { code: string; name: string; count: number }[];
  byStatus: { status: string; count: number }[];
  monthlyAppointments: { month: string; count: number }[];
}

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
    paidPayments,
    pendingPayments,
    byType,
    byStatus,
    recentAppointments,
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
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
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

  return {
    totalAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowCount,
    totalRevenue: (paidPayments._sum.amount ?? 0).toString(),
    pendingPayments,
    byConsultation,
    byStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count._all,
    })),
    monthlyAppointments,
  };
}
