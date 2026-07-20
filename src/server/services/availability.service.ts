import { ConsultationType } from "@prisma/client";
import {
  computeSlotsForDay,
  type ComputedSlot,
} from "@/lib/booking-slots";
import { weekdayFromDateKey } from "@/lib/scheduling-dates";
import {
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

  if (isPrismaRecurringBlockedWeekdayReady()) {
    const weekday = weekdayFromDateKey(dateStr);
    const recurring = await prisma.recurringBlockedWeekday.findUnique({
      where: { weekday },
      select: { id: true },
    });
    if (recurring) return [];
  }

  const dayStart = new Date(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    0,
    0,
    0,
    0,
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

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
    ],
  });
}
