import type { Prisma } from "@prisma/client";
import {
  ConsultationType,
  ConsultationModality,
  type PrismaClient,
} from "@prisma/client";
import { prisma, isPrismaRecurringBlockedWeekdayReady } from "@/server/db/prisma";
import { toDateKey, weekdayFromDateKey } from "@/lib/scheduling-dates";
import { TimeSlotTakenError } from "@/lib/scheduling-errors";

export type SchedulingError =
  | "MODALITY_NOT_ALLOWED"
  | "OUTSIDE_MORNING_WINDOW"
  | "TIME_SLOT_TAKEN"
  | "INVALID_TIME"
  | "BLOCKED_TIME";

export type ValidationResult =
  | { ok: true; endTime: Date }
  | { ok: false; error: SchedulingError; message: string };

type DbLike = PrismaClient | Prisma.TransactionClient;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function overlapWhere(params: {
  startTime: Date;
  endTime: Date;
  excludeAppointmentId?: string;
}): Prisma.AppointmentWhereInput {
  return {
    ...(params.excludeAppointmentId
      ? { id: { not: params.excludeAppointmentId } }
      : {}),
    status: { in: ["PENDING", "CONFIRMED"] },
    startTime: { lt: params.endTime },
    endTime: { gt: params.startTime },
  };
}

/** Busca otra cita activa que se solape con el rango [startTime, endTime). */
export async function findOverlappingAppointment(
  db: DbLike,
  params: {
    startTime: Date;
    endTime: Date;
    excludeAppointmentId?: string;
  },
) {
  return db.appointment.findFirst({
    where: overlapWhere(params),
    select: { id: true },
  });
}

/** Busca un bloqueo de agenda que se solape con el rango [startTime, endTime). */
export async function findOverlappingBlock(
  db: DbLike,
  params: { startTime: Date; endTime: Date },
) {
  return db.scheduleBlock.findFirst({
    where: {
      startTime: { lt: params.endTime },
      endTime: { gt: params.startTime },
    },
    select: { id: true },
  });
}

/**
 * Revalida solapamiento dentro de una transacción (antes del INSERT).
 * La garantía final la da el exclusion constraint en PostgreSQL.
 */
export async function assertNoOverlapInTransaction(
  tx: Prisma.TransactionClient,
  params: {
    startTime: Date;
    endTime: Date;
    excludeAppointmentId?: string;
  },
): Promise<void> {
  const overlap = await findOverlappingAppointment(tx, params);
  if (overlap) {
    throw new TimeSlotTakenError();
  }
}

function validateBusinessRules(params: {
  consultationType: ConsultationType;
  startTime: Date;
  modality: ConsultationModality;
}): ValidationResult | { ok: true; endTime: Date } {
  const { consultationType, startTime, modality } = params;

  if (Number.isNaN(startTime.getTime())) {
    return { ok: false, error: "INVALID_TIME", message: "Fecha inválida." };
  }

  if (modality === "ONLINE" && !consultationType.allowsOnline) {
    return {
      ok: false,
      error: "MODALITY_NOT_ALLOWED",
      message: `${consultationType.name} no admite modalidad online.`,
    };
  }
  if (modality === "PRESENCIAL" && !consultationType.allowsPresencial) {
    return {
      ok: false,
      error: "MODALITY_NOT_ALLOWED",
      message: `${consultationType.name} no admite modalidad presencial.`,
    };
  }

  const endTime = new Date(
    startTime.getTime() + consultationType.durationMinutes * 60_000,
  );

  if (consultationType.morningOnly) {
    const start = consultationType.morningStart ?? "08:00";
    const end = consultationType.morningEnd ?? "12:00";
    const startMin = startTime.getHours() * 60 + startTime.getMinutes();
    const endMin = endTime.getHours() * 60 + endTime.getMinutes();

    if (startMin < toMinutes(start) || endMin > toMinutes(end)) {
      return {
        ok: false,
        error: "OUTSIDE_MORNING_WINDOW",
        message: `${consultationType.name} solo se agenda entre ${start} y ${end}.`,
      };
    }
  }

  return { ok: true, endTime };
}

/**
 * Valida una solicitud de cita contra reglas de negocio y solapamiento (lectura previa).
 * Al persistir, se revalida dentro de la transacción + constraint PostgreSQL.
 */
export async function validateAppointmentSlot(params: {
  consultationType: ConsultationType;
  startTime: Date;
  modality: ConsultationModality;
  excludeAppointmentId?: string;
}): Promise<ValidationResult> {
  const { consultationType, startTime, modality, excludeAppointmentId } =
    params;

  const rules = validateBusinessRules({ consultationType, startTime, modality });
  if (!rules.ok) return rules;

  const blockedDay = await prisma.blockedDay.findUnique({
    where: { date: toDateKey(startTime) },
    select: { id: true },
  });
  if (blockedDay) {
    return {
      ok: false,
      error: "BLOCKED_TIME",
      message: "Ese día no hay atención.",
    };
  }

  if (isPrismaRecurringBlockedWeekdayReady()) {
    const weekday = weekdayFromDateKey(toDateKey(startTime));
    const recurring = await prisma.recurringBlockedWeekday.findUnique({
      where: { weekday },
      select: { id: true },
    });
    if (recurring) {
      return {
        ok: false,
        error: "BLOCKED_TIME",
        message: "Ese día de la semana no hay atención.",
      };
    }
  }

  const overlap = await findOverlappingAppointment(prisma, {
    startTime,
    endTime: rules.endTime,
    excludeAppointmentId,
  });

  if (overlap) {
    return {
      ok: false,
      error: "TIME_SLOT_TAKEN",
      message: "Ese bloque horario ya está ocupado.",
    };
  }

  const blocked = await findOverlappingBlock(prisma, {
    startTime,
    endTime: rules.endTime,
  });

  if (blocked) {
    return {
      ok: false,
      error: "BLOCKED_TIME",
      message: "Ese horario está bloqueado en la agenda.",
    };
  }

  return { ok: true, endTime: rules.endTime };
}
