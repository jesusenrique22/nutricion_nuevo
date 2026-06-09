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

/** Resumen del día para el panel de la nutricionista. */
export async function getAdminTodayDashboard(): Promise<AdminTodayDashboard | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;

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
}
