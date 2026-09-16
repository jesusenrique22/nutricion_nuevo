import type { Prisma } from "@prisma/client";
import {
  ConsultationType,
  ConsultationModality,
  type PrismaClient,
} from "@prisma/client";
import {
  clinicDateTimeToUtc,
  dateKeyInClinicTz,
  minutesInClinicTz,
  toMinutesHhmm,
} from "@/lib/clinic-timezone";
import { weekdayFromDateKey } from "@/lib/scheduling-dates";
import { TimeSlotTakenError } from "@/lib/scheduling-errors";
import {
  isPrismaInternalEventReady,
  isPrismaRecurringBlockedWeekdayPartialReady,
  isPrismaRecurringBlockedWeekdayReady,
  prisma,
} from "@/server/db/prisma";

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
 * Busca un evento de agenda interno (seguimiento, reunión, espacio propio) que
 * pise el rango. Son horarios ocupados aunque no sean citas: nadie debe poder
 * reservarlos desde la web.
 */
export async function findOverlappingInternalEvent(
  db: DbLike,
  params: {
    startTime: Date;
    endTime: Date;
    excludeInternalEventId?: string;
  },
) {
  if (!isPrismaInternalEventReady()) return null;

  return db.internalEvent.findFirst({
    where: {
      ...(params.excludeInternalEventId
        ? { id: { not: params.excludeInternalEventId } }
        : {}),
      cancelledAt: null,
      startTime: { lt: params.endTime },
      endTime: { gt: params.startTime },
    },
    select: { id: true, title: true },
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

  const internal = await findOverlappingInternalEvent(tx, params);
  if (internal) {
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
    // Crítico: hora de Buenos Aires, no getHours() del server (UTC en Vercel).
    const startMin = minutesInClinicTz(startTime);
    const endMin = minutesInClinicTz(endTime);

    if (startMin < toMinutesHhmm(start) || endMin > toMinutesHhmm(end)) {
      return {
        ok: false,
        error: "OUTSIDE_MORNING_WINDOW",
        message: `${consultationType.name} solo se agenda entre ${start} y ${end} (hora Argentina).`,
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

  const dateKey = dateKeyInClinicTz(startTime);

  const blockedDay = await prisma.blockedDay.findUnique({
    where: { date: dateKey },
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
    const weekday = weekdayFromDateKey(dateKey);
    const select = isPrismaRecurringBlockedWeekdayPartialReady()
      ? ({ id: true, startTime: true, endTime: true } as const)
      : ({ id: true } as const);
    const recurring = await prisma.recurringBlockedWeekday.findUnique({
      where: { weekday },
      select,
    });
    if (recurring) {
      const windowStart =
        "startTime" in recurring
          ? (recurring.startTime as string | null)?.trim() || null
          : null;
      const windowEnd =
        "endTime" in recurring
          ? (recurring.endTime as string | null)?.trim() || null
          : null;

      if (!windowStart || !windowEnd) {
        return {
          ok: false,
          error: "BLOCKED_TIME",
          message: "Ese día de la semana no hay atención.",
        };
      }

      const blockStart = clinicDateTimeToUtc(dateKey, windowStart);
      const blockEnd = clinicDateTimeToUtc(dateKey, windowEnd);
      if (startTime < blockEnd && rules.endTime > blockStart) {
        return {
          ok: false,
          error: "BLOCKED_TIME",
          message: `Ese día no hay atención entre ${windowStart} y ${windowEnd}.`,
        };
      }
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

  const internalEvent = await findOverlappingInternalEvent(prisma, {
    startTime,
    endTime: rules.endTime,
  });

  if (internalEvent) {
    return {
      ok: false,
      error: "BLOCKED_TIME",
      message: "Ese horario ya está tomado por otro evento de la agenda.",
    };
  }

  return { ok: true, endTime: rules.endTime };
}
