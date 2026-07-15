"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { getAvailableSlots, type Slot } from "@/server/services/availability.service";

export interface ConsultationTypeDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  imageUrl: string | null;
  allowsOnline: boolean;
  allowsPresencial: boolean;
  morningOnly: boolean;
  morningStart: string | null;
  morningEnd: string | null;
}

export async function getConsultationTypes(): Promise<ConsultationTypeDTO[]> {
  try {
    const types = await prisma.consultationType.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
    return types.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      durationMinutes: t.durationMinutes,
      price: t.price.toString(),
      imageUrl: t.imageUrl,
      allowsOnline: t.allowsOnline,
      allowsPresencial: t.allowsPresencial,
      morningOnly: t.morningOnly,
      morningStart: t.morningStart,
      morningEnd: t.morningEnd,
    }));
  } catch {
    return [];
  }
}

export async function getSlotsForDay(
  consultationTypeId: string,
  dateStr: string,
  excludeAppointmentId?: string,
): Promise<Slot[]> {
  const type = await prisma.consultationType.findUnique({
    where: { id: consultationTypeId },
  });
  if (!type) return [];
  return getAvailableSlots(type, dateStr, excludeAppointmentId);
}

/**
 * Fechas YYYY-MM-DD sin atención en un rango (días puntuales + días de la semana fijos).
 * Usado por el calendario de reserva del paciente.
 */
export async function getUnavailableBookingDates(params: {
  from: string;
  to: string;
}): Promise<string[]> {
  const from = params.from?.trim();
  const to = params.to?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return [];
  }
  if (to < from) return [];

  const { dateRangeKeys, weekdayFromDateKey } = await import(
    "@/lib/scheduling-dates"
  );
  const {
    isPrismaRecurringBlockedWeekdayReady,
    prisma: db,
  } = await import("@/server/db/prisma");

  const keys = dateRangeKeys(from, to);
  if (keys.length === 0) return [];

  const blocked = new Set<string>();

  try {
    const specific = await db.blockedDay.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true },
    });
    for (const row of specific) blocked.add(row.date);
  } catch {
    // ignore
  }

  if (isPrismaRecurringBlockedWeekdayReady()) {
    try {
      const recurring = await db.recurringBlockedWeekday.findMany({
        select: { weekday: true },
      });
      const weekdays = new Set(recurring.map((r) => r.weekday));
      if (weekdays.size > 0) {
        for (const key of keys) {
          if (weekdays.has(weekdayFromDateKey(key))) blocked.add(key);
        }
      }
    } catch {
      // ignore
    }
  }

  return [...blocked].sort();
}

/** Slots disponibles para reagendar una cita existente. */
export async function getRescheduleSlots(
  appointmentId: string,
  dateStr: string,
): Promise<Slot[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { consultationType: true },
  });
  if (!appt) return [];

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && appt.patientId !== session.user.id) return [];

  if (!["PENDING", "CONFIRMED"].includes(appt.status)) return [];

  return getAvailableSlots(appt.consultationType, dateStr, appt.id);
}

import { toPaymentPhaseView } from "@/lib/payment-split";

export interface PaymentPhaseDTO {
  advanceAmount: string;
  remainderAmount: string;
  advancePercent: number;
  advanceStatus: string;
  remainderStatus: string;
  overallStatus: string;
}

export interface AppointmentDTO {
  id: string;
  start: string;
  end: string;
  title: string;
  status: string;
  modality: string;
  flow: string;
  patientName?: string;
  patientId?: string;
  consultationCode?: string;
  consultationName?: string;
  price?: string;
  paymentStatus?: string | null;
  paymentPhases?: PaymentPhaseDTO | null;
  notes?: string | null;
  cancelledBy?: "PATIENT" | "ADMIN" | null;
  cancelledAt?: string | null;
}

/** Citas del paciente autenticado. */
export async function getMyAppointments(): Promise<AppointmentDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const appts = await prisma.appointment.findMany({
      where: {
        patientId: session.user.id,
        status: { not: "CANCELLED" },
      },
      include: { consultationType: true, payment: true },
      orderBy: { startTime: "desc" },
    });

    return appts.map((a) => ({
      id: a.id,
      start: a.startTime.toISOString(),
      end: a.endTime.toISOString(),
      title: a.consultationType.name,
      status: a.status,
      modality: a.modality,
      flow: a.flow,
      consultationCode: a.consultationType.code,
      consultationName: a.consultationType.name,
      price: a.consultationType.price.toString(),
      paymentStatus: a.payment?.status ?? null,
      paymentPhases: a.payment ? toPaymentPhaseView(a.payment) : null,
      notes: a.notes,
    }));
  } catch {
    return [];
  }
}

/** Todas las citas (solo ADMIN) — para el calendario de la doctora. */
export async function getAllAppointments(): Promise<AppointmentDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const appts = await prisma.appointment.findMany({
    include: { consultationType: true, patient: true, payment: true },
    orderBy: { startTime: "asc" },
  });

  return appts.map((a) => ({
    id: a.id,
    start: a.startTime.toISOString(),
    end: a.endTime.toISOString(),
    title: `${a.consultationType.name} · ${a.patient.name}`,
    status: a.status,
    modality: a.modality,
    flow: a.flow,
    patientName: a.patient.name,
    patientId: a.patientId,
    consultationCode: a.consultationType.code,
    consultationName: a.consultationType.name,
    price: a.consultationType.price.toString(),
    paymentStatus: a.payment?.status ?? null,
    paymentPhases: a.payment ? toPaymentPhaseView(a.payment) : null,
    notes: a.notes,
    cancelledBy: a.cancelledBy,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
  }));
}
