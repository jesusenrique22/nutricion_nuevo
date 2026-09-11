"use server";

import { cache } from "react";
import { auth } from "@/lib/auth";
import type { BookingAvailabilitySnapshot } from "@/lib/booking-slots";
import { clinicDateAtMinutes, clinicDateTimeToUtc, dateKeyInClinicTz } from "@/lib/clinic-timezone";
import {
  buildAppointmentPaymentPlan,
  type AppointmentPaymentPlan,
} from "@/lib/appointment-remainder";
import { getPaymentQuerySelect } from "@/lib/payment-query-select";
import { toPaymentPhaseView } from "@/lib/payment-split";
import { dateRangeKeys, weekdayFromDateKey } from "@/lib/scheduling-dates";
import {
  isPrismaRecurringBlockedWeekdayPartialReady,
  isPrismaRecurringBlockedWeekdayReady,
  prisma,
} from "@/server/db/prisma";
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

function mapConsultationType(t: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: { toString(): string };
  imageUrl: string | null;
  allowsOnline: boolean;
  allowsPresencial: boolean;
  morningOnly: boolean;
  morningStart: string | null;
  morningEnd: string | null;
}): ConsultationTypeDTO {
  return {
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
  };
}

export const getConsultationTypes = cache(
  async (): Promise<ConsultationTypeDTO[]> => {
    try {
      const types = await prisma.consultationType.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      });
      return types.map(mapConsultationType);
    } catch {
      return [];
    }
  },
);

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

  const keys = dateRangeKeys(from, to);
  if (keys.length === 0) return [];

  const blocked = new Set<string>();

  try {
    const specific = await prisma.blockedDay.findMany({
      where: { date: { gte: from, lte: to } },
      select: { date: true },
    });
    for (const row of specific) blocked.add(row.date);
  } catch {
    // ignore
  }

  if (isPrismaRecurringBlockedWeekdayReady()) {
    try {
      const partial = isPrismaRecurringBlockedWeekdayPartialReady();
      const recurring = await prisma.recurringBlockedWeekday.findMany({
        select: partial
          ? { weekday: true, startTime: true, endTime: true }
          : { weekday: true },
      });
      // Solo días completos van al calendario como “no disponibles”.
      // Las franjas parciales se inyectan como busy en el snapshot.
      const fullDayWeekdays = new Set(
        recurring
          .filter((r) => {
            if (!partial) return true;
            const start =
              "startTime" in r
                ? (r.startTime as string | null)?.trim()
                : null;
            const end =
              "endTime" in r ? (r.endTime as string | null)?.trim() : null;
            return !start || !end;
          })
          .map((r) => r.weekday),
      );
      if (fullDayWeekdays.size > 0) {
        for (const key of keys) {
          if (fullDayWeekdays.has(weekdayFromDateKey(key))) blocked.add(key);
        }
      }
    } catch {
      // ignore
    }
  }

  return [...blocked].sort();
}

/** Intervalos busy sintéticos por bloqueos recurrentes de franja (no día completo). */
async function getRecurringPartialBusyIntervals(
  from: string,
  to: string,
): Promise<{ start: string; end: string }[]> {
  if (!isPrismaRecurringBlockedWeekdayReady()) return [];
  if (!isPrismaRecurringBlockedWeekdayPartialReady()) return [];

  try {
    const recurring = await prisma.recurringBlockedWeekday.findMany({
      select: { weekday: true, startTime: true, endTime: true },
    });
    const partials = recurring.filter((r) => {
      const start = r.startTime?.trim();
      const end = r.endTime?.trim();
      return Boolean(start && end);
    });
    if (partials.length === 0) return [];

    const byWeekday = new Map(
      partials.map((r) => [
        r.weekday,
        { start: r.startTime!.trim(), end: r.endTime!.trim() },
      ]),
    );
    const out: { start: string; end: string }[] = [];
    for (const key of dateRangeKeys(from, to)) {
      const window = byWeekday.get(weekdayFromDateKey(key));
      if (!window) continue;
      out.push({
        start: clinicDateTimeToUtc(key, window.start).toISOString(),
        end: clinicDateTimeToUtc(key, window.end).toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function addDaysKey(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function todayKey(): string {
  return dateKeyInClinicTz(new Date());
}

/**
 * Una sola carga de agenda para el cliente: días bloqueados + intervalos ocupados.
 * Los slots se calculan en memoria al cambiar tipo/fecha (sin más trips a la DB).
 */
export async function getBookingAvailabilitySnapshot(params?: {
  from?: string;
  to?: string;
}): Promise<BookingAvailabilitySnapshot> {
  const from = params?.from?.trim() || todayKey();
  const to = params?.to?.trim() || addDaysKey(from, 92);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { from, to, blockedDates: [], busy: [] };
  }

  const rangeStart = clinicDateAtMinutes(from, 0);
  const rangeEnd = clinicDateAtMinutes(to, 24 * 60);

  const [blockedDates, appointments, blocks, recurringPartial] =
    await Promise.all([
      getUnavailableBookingDates({ from, to }),
      prisma.appointment.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.scheduleBlock.findMany({
        where: {
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { startTime: true, endTime: true },
      }),
      getRecurringPartialBusyIntervals(from, to),
    ]);

  return {
    from,
    to,
    blockedDates,
    busy: [
      ...appointments.map((a) => ({
        start: a.startTime.toISOString(),
        end: a.endTime.toISOString(),
      })),
      ...blocks.map((b) => ({
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString(),
      })),
      ...recurringPartial,
    ],
  };
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
  paymentPlan?: AppointmentPaymentPlan | null;
  notes?: string | null;
  cancelledBy?: "PATIENT" | "ADMIN" | null;
  cancelledAt?: string | null;
}

/** Citas del paciente autenticado. */
export async function getMyAppointments(): Promise<AppointmentDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const paymentSelect = await getPaymentQuerySelect();
    const appts = await prisma.appointment.findMany({
      where: {
        patientId: session.user.id,
        status: { not: "CANCELLED" },
      },
      include: {
        consultationType: true,
        payment: { select: paymentSelect },
      },
      orderBy: { startTime: "desc" },
    });

    return appts.map((a) => {
      const paymentPhases = a.payment ? toPaymentPhaseView(a.payment) : null;
      const payment = a.payment;
      const remainderSubmittedAt =
        payment && "remainderSubmittedAt" in payment
          ? (payment.remainderSubmittedAt as Date | null | undefined) ?? null
          : null;
      const paymentPlan =
        payment && paymentPhases
          ? buildAppointmentPaymentPlan({
              phases: paymentPhases,
              totalAmount: payment.amount.toString(),
              dueAt: a.startTime,
              endAt: a.endTime,
              remainderSubmittedAt,
            })
          : null;

      return {
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
        paymentStatus: payment?.status ?? null,
        paymentPhases,
        paymentPlan,
        notes: a.notes,
      };
    });
  } catch (err) {
    console.error("[getMyAppointments]", err);
    return [];
  }
}

/** Todas las citas (solo ADMIN) — para el calendario de la doctora. */
export async function getAllAppointments(): Promise<AppointmentDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const paymentSelect = await getPaymentQuerySelect();
  const appts = await prisma.appointment.findMany({
    include: {
      consultationType: true,
      patient: true,
      payment: { select: paymentSelect },
    },
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
