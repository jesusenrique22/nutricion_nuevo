"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { modalityLabels } from "@/lib/appointment-labels";

export interface TodayAppointmentItem {
  id: string;
  patientName: string;
  time: string;
  modality: string;
  modalityLabel: string;
  consultationName: string;
  consultationCode: string;
  status: string;
}

export interface AdminTodayDashboard {
  todayLabel: string;
  pendingTodayCount: number;
  patientsTodayCount: number;
  appointmentsToday: TodayAppointmentItem[];
}

export interface AdminUpcomingAppointment {
  id: string;
  patientName: string;
  dateLabel: string;
  time: string;
  consultationName: string;
  status: string;
}

export interface AdminDashboardOverview {
  stats: {
    activePatients: number;
    weekAppointments: number;
    pendingPurchases: number;
    publishedResources: number;
  };
  upcomingAppointments: AdminUpcomingAppointment[];
  recentNotifications: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    isRead: boolean;
  }[];
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatTodayLabel(date: Date) {
  const formatted = date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(date: Date) {
  const label = date.toLocaleDateString("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek() {
  const start = startOfWeek();
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Resumen del día para el panel de la nutricionista. */
export async function getAdminTodayDashboard(): Promise<AdminTodayDashboard | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  try {
    const appts = await prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfToday(), lte: endOfToday() },
        status: { notIn: ["CANCELLED"] },
      },
      include: { consultationType: true, patient: true },
      orderBy: { startTime: "asc" },
    });

    const pendingTodayCount = appts.filter((a) => a.status === "PENDING").length;
    const patientsTodayCount = new Set(appts.map((a) => a.patientId)).size;

    return {
      todayLabel: formatTodayLabel(new Date()),
      pendingTodayCount,
      patientsTodayCount,
      appointmentsToday: appts.map((a) => ({
        id: a.id,
        patientName: a.patient.name,
        time: formatTime(a.startTime),
        modality: a.modality,
        modalityLabel: modalityLabels[a.modality] ?? a.modality,
        consultationName: a.consultationType.name,
        consultationCode: a.consultationType.code,
        status: a.status,
      })),
    };
  } catch {
    return null;
  }
}

/** Resumen ampliado para rellenar el inicio del panel admin. */
export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

  try {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const twoWeeks = new Date(now);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    const visibleTypes = [
      "APPOINTMENT_CONFIRMED",
      "APPOINTMENT_REMINDER",
      "APPOINTMENT_CANCELLED",
      "RESOURCE_UNLOCKED",
      "REFUND_REQUESTED",
      "REFUND_RESOLVED",
    ] as const;

    const [
      activePatients,
      weekAppointments,
      pendingResourcePurchases,
      pendingProductPurchases,
      publishedResources,
      upcoming,
      recentNotifications,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: "PATIENT",
          patientProfile: { is: { hiddenFromAdminList: false } },
        },
      }),
      prisma.appointment.count({
        where: {
          startTime: { gte: startOfWeek(), lte: endOfWeek() },
          status: { notIn: ["CANCELLED"] },
        },
      }),
      prisma.resourcePurchase.count({
        where: { status: "PENDING", inboxDismissedAt: null },
      }),
      prisma.productPurchase.count({
        where: { status: "PENDING", inboxDismissedAt: null },
      }),
      prisma.resource.count({ where: { isPublished: true } }),
      prisma.appointment.findMany({
        where: {
          startTime: { gte: tomorrow, lte: twoWeeks },
          status: { notIn: ["CANCELLED"] },
        },
        include: { consultationType: true, patient: true },
        orderBy: { startTime: "asc" },
        take: 6,
      }),
      prisma.notification.findMany({
        where: {
          recipientId: session.user.id,
          type: { in: [...visibleTypes] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      stats: {
        activePatients,
        weekAppointments,
        pendingPurchases: pendingResourcePurchases + pendingProductPurchases,
        publishedResources,
      },
      upcomingAppointments: upcoming.map((a) => ({
        id: a.id,
        patientName: a.patient.name,
        dateLabel: formatDateShort(a.startTime),
        time: formatTime(a.startTime),
        consultationName: a.consultationType.name,
        status: a.status,
      })),
      recentNotifications: recentNotifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        isRead: n.isRead,
      })),
    };
  } catch {
    return null;
  }
}
