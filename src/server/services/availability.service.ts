import { ConsultationType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

// Horario general de la clínica (para consultas no matutinas)
const CLINIC_OPEN = "08:00";
const CLINIC_CLOSE = "18:00";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Construye un Date combinando una fecha (YYYY-MM-DD) y minutos del día. */
function dateAtMinutes(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  date.setMinutes(minutes);
  return date;
}

export interface Slot {
  start: string; // ISO
  end: string; // ISO
  label: string; // "09:00"
}

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

  const windowStart = consultationType.morningOnly
    ? toMinutes(consultationType.morningStart ?? "08:00")
    : toMinutes(CLINIC_OPEN);
  const windowEnd = consultationType.morningOnly
    ? toMinutes(consultationType.morningEnd ?? "12:00")
    : toMinutes(CLINIC_CLOSE);

  const duration = consultationType.durationMinutes;

  // Citas activas del día (cualquier tipo) para validar cruce global
  const dayStart = dateAtMinutes(dateStr, 0);
  const dayEnd = dateAtMinutes(dateStr, 24 * 60);
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

  const now = new Date();
  const slots: Slot[] = [];

  for (let t = windowStart; t + duration <= windowEnd; t += duration) {
    const start = dateAtMinutes(dateStr, t);
    const end = dateAtMinutes(dateStr, t + duration);

    if (start < now) continue; // no agendar en el pasado

    const overlaps = taken.some(
      (a) => a.startTime < end && a.endTime > start,
    );
    if (overlaps) continue;

    const blocked = blocks.some(
      (b) => b.startTime < end && b.endTime > start,
    );
    if (blocked) continue;

    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${hh}:${mm}`,
    });
  }

  return slots;
}
