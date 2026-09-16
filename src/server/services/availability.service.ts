import { ConsultationType } from "@prisma/client";
import {
  computeSlotsForDay,
  type BusyInterval,
  type ComputedSlot,
} from "@/lib/booking-slots";
import { clinicDateAtMinutes, clinicDateTimeToUtc } from "@/lib/clinic-timezone";
import { weekdayFromDateKey } from "@/lib/scheduling-dates";
import {
  isPrismaInternalEventReady,
  isPrismaRecurringBlockedWeekdayPartialReady,
  isPrismaRecurringBlockedWeekdayReady,
  prisma,
} from "@/server/db/prisma";

export type Slot = ComputedSlot;

/**
 * Genera los slots disponibles para un tipo de consulta en una fecha dada,
 * respetando la ventana matutina (ANT-03) y descartando solapamientos y horas
 * pasadas.
 */
export async function getAvailableSlots(
  consultationType: ConsultationType,
  dateStr: string,
  excludeAppointmentId?: string,
): Promise<Slot[]> {
  const blockedDay = await prisma.blockedDay.findUnique({
    where: { date: dateStr },
    select: { id: true },
  });
  if (blockedDay) return [];

  const recurringBusy: BusyInterval[] = [];

  if (isPrismaRecurringBlockedWeekdayReady()) {
    const weekday = weekdayFromDateKey(dateStr);
    const partial = isPrismaRecurringBlockedWeekdayPartialReady();
    const recurring = await prisma.recurringBlockedWeekday.findUnique({
      where: { weekday },
      select: partial
        ? { id: true, startTime: true, endTime: true }
        : { id: true },
    });
    if (recurring) {
      const windowStart =
        partial && "startTime" in recurring
          ? (recurring.startTime as string | null)?.trim() || null
          : null;
      const windowEnd =
        partial && "endTime" in recurring
          ? (recurring.endTime as string | null)?.trim() || null
          : null;

      if (!windowStart || !windowEnd) {
        return [];
      }

      recurringBusy.push({
        start: clinicDateTimeToUtc(dateStr, windowStart).toISOString(),
        end: clinicDateTimeToUtc(dateStr, windowEnd).toISOString(),
      });
    }
  }

  const dayStart = clinicDateAtMinutes(dateStr, 0);
  const dayEnd = clinicDateAtMinutes(dateStr, 24 * 60);

  const taken = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: dayStart, lt: dayEnd },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });

  const blocks = await prisma.scheduleBlock.findMany({
    where: {
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    select: { startTime: true, endTime: true },
  });

  // Los eventos de agenda de la nutricionista (seguimientos, reuniones) ocupan
  // el horario igual que una cita, pero nunca se ofrecen para reservar.
  const internalEvents = isPrismaInternalEventReady()
    ? await prisma.internalEvent.findMany({
        where: {
          cancelledAt: null,
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      })
    : [];

  return computeSlotsForDay({
    dateStr,
    type: consultationType,
    busy: [
      ...taken.map((a) => ({
        start: a.startTime.toISOString(),
        end: a.endTime.toISOString(),
      })),
      ...blocks.map((b) => ({
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString(),
      })),
      ...internalEvents.map((e) => ({
        start: e.startTime.toISOString(),
        end: e.endTime.toISOString(),
      })),
      ...recurringBusy,
    ],
  });
}
