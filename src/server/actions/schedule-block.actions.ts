"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import {
  clinicDateTimeToUtc,
  dateKeyInClinicTz,
  toMinutesHhmm,
} from "@/lib/clinic-timezone";
import { formatActionError } from "@/lib/db-errors";
import { dateRangeKeys, weekdayLabel } from "@/lib/scheduling-dates";
import {
  createBlockedDaysSchema,
  createRecurringBlockedWeekdaysSchema,
  createScheduleBlockSchema,
  deleteBlockedDaySchema,
  deleteRecurringBlockedWeekdaySchema,
  deleteScheduleBlockSchema,
  updateRecurringBlockedWeekdaySchema,
  updateScheduleBlockSchema,
} from "@/lib/validators/appointment-status";
import {
  isPrismaRecurringBlockedWeekdayPartialReady,
  isPrismaRecurringBlockedWeekdayReady,
  prisma,
} from "@/server/db/prisma";

export interface ScheduleBlockDTO {
  id: string;
  start: string;
  end: string;
  reason: string | null;
}

export interface BlockedDayDTO {
  id: string;
  date: string;
  reason: string | null;
}

export interface RecurringBlockedWeekdayDTO {
  id: string;
  weekday: number;
  reason: string | null;
  /** HH:mm — null = día completo. */
  startTime: string | null;
  /** HH:mm — null = día completo. */
  endTime: string | null;
}

export type BlockActionResult =
  | { ok: true; count?: number }
  | { ok: false; message: string };

export async function getScheduleBlocks(): Promise<ScheduleBlockDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const now = new Date();
  const blocks = await prisma.scheduleBlock.findMany({
    where: { endTime: { gte: now } },
    orderBy: { startTime: "asc" },
    take: 50,
  });

  return blocks.map((b) => ({
    id: b.id,
    start: b.startTime.toISOString(),
    end: b.endTime.toISOString(),
    reason: b.reason,
  }));
}

export async function getBlockedDays(): Promise<BlockedDayDTO[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const today = dateKeyInClinicTz(new Date());
  const days = await prisma.blockedDay.findMany({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
    take: 90,
  });

  return days.map((d) => ({
    id: d.id,
    date: d.date,
    reason: d.reason,
  }));
}

export async function getRecurringBlockedWeekdays(): Promise<
  RecurringBlockedWeekdayDTO[]
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];
  if (!isPrismaRecurringBlockedWeekdayReady()) {
    console.warn(
      "[getRecurringBlockedWeekdays] Prisma Client sin recurringBlockedWeekday — corré pnpm db:generate && pnpm run dev:clean",
    );
    return [];
  }

  const partial = isPrismaRecurringBlockedWeekdayPartialReady();
  const rows = await prisma.recurringBlockedWeekday.findMany({
    orderBy: { weekday: "asc" },
  });

  // Orden Lun→Dom y, dentro de cada día, por hora de inicio: un día puede
  // tener varias franjas y deben leerse en orden.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const startOf = (row: { startTime?: string | null }) =>
    partial ? (row.startTime?.trim() ?? "") : "";

  return [...rows]
    .sort((a, b) => {
      const byDay = order.indexOf(a.weekday) - order.indexOf(b.weekday);
      if (byDay !== 0) return byDay;
      return startOf(a).localeCompare(startOf(b));
    })
    .map((r) => ({
      id: r.id,
      weekday: r.weekday,
      reason: r.reason,
      startTime: partial
        ? ((r as { startTime?: string | null }).startTime ?? null)
        : null,
      endTime: partial
        ? ((r as { endTime?: string | null }).endTime ?? null)
        : null,
    }));
}

export async function createBlockedDays(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = createBlockedDaysSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const toDate = parsed.data.toDate ?? parsed.data.fromDate;
    const keys = dateRangeKeys(parsed.data.fromDate, toDate);
    if (keys.length === 0) {
      return {
        ok: false,
        message: "La fecha de fin debe ser igual o posterior al inicio.",
      };
    }

    const today = dateKeyInClinicTz(new Date());
    const futureKeys = keys.filter((k) => k >= today);
    if (futureKeys.length === 0) {
      return { ok: false, message: "No podés bloquear días en el pasado." };
    }

    const reason = parsed.data.reason?.trim() || null;

    await prisma.$transaction(
      futureKeys.map((date) =>
        prisma.blockedDay.upsert({
          where: { date },
          create: { date, reason },
          update: reason ? { reason } : {},
        }),
      ),
    );

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true, count: futureKeys.length };
  } catch (err) {
    console.error("[createBlockedDays]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudieron bloquear los días."),
    };
  }
}

export async function createRecurringBlockedWeekdays(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }
    if (!isPrismaRecurringBlockedWeekdayReady()) {
      return {
        ok: false,
        message:
          "No se pudo completar la acción. Recargá la página e intentá de nuevo.",
      };
    }

    const parsed = createRecurringBlockedWeekdaysSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    const unique = [...new Set(parsed.data.weekdays)];
    const reason = parsed.data.reason?.trim() || null;
    const startTime = parsed.data.startTime?.trim() || null;
    const endTime = parsed.data.endTime?.trim() || null;
    const partialReady = isPrismaRecurringBlockedWeekdayPartialReady();

    if ((startTime || endTime) && !partialReady) {
      return {
        ok: false,
        message:
          "No se pudo bloquear esa franja horaria. Recargá la página e intentá de nuevo.",
      };
    }

    const isFullDay = !startTime || !endTime;

    if (!isFullDay && toMinutesHhmm(endTime) <= toMinutesHhmm(startTime)) {
      return {
        ok: false,
        message: "La hora de fin debe ser posterior al inicio.",
      };
    }

    const existing = await prisma.recurringBlockedWeekday.findMany({
      where: { weekday: { in: unique } },
      select: partialReady
        ? { id: true, weekday: true, startTime: true, endTime: true }
        : { id: true, weekday: true },
    });

    const windowsByWeekday = new Map<
      number,
      { id: string; start: string | null; end: string | null }[]
    >();
    for (const row of existing) {
      const list = windowsByWeekday.get(row.weekday) ?? [];
      list.push({
        id: row.id,
        start:
          "startTime" in row ? (row.startTime as string | null) : null,
        end: "endTime" in row ? (row.endTime as string | null) : null,
      });
      windowsByWeekday.set(row.weekday, list);
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [];
    const skipped: number[] = [];
    let created = 0;

    for (const weekday of unique) {
      const current = windowsByWeekday.get(weekday) ?? [];
      const hasFullDay = current.some((w) => !w.start || !w.end);

      if (isFullDay) {
        // El día completo absorbe cualquier franja parcial que hubiera.
        if (hasFullDay && current.length === 1) {
          skipped.push(weekday);
          continue;
        }
        operations.push(
          prisma.recurringBlockedWeekday.deleteMany({ where: { weekday } }),
        );
        operations.push(
          prisma.recurringBlockedWeekday.create({
            data: partialReady
              ? { weekday, reason, startTime: null, endTime: null }
              : { weekday, reason },
          }),
        );
        created += 1;
        continue;
      }

      // Ese día ya no se trabaja entero: una franja no agrega nada.
      if (hasFullDay) {
        skipped.push(weekday);
        continue;
      }

      const newStart = toMinutesHhmm(startTime);
      const newEnd = toMinutesHhmm(endTime);
      const overlaps = current.some((w) => {
        if (!w.start || !w.end) return false;
        return (
          toMinutesHhmm(w.start) < newEnd && toMinutesHhmm(w.end) > newStart
        );
      });

      if (overlaps) {
        skipped.push(weekday);
        continue;
      }

      operations.push(
        prisma.recurringBlockedWeekday.create({
          data: { weekday, reason, startTime, endTime },
        }),
      );
      created += 1;
    }

    if (created === 0) {
      return {
        ok: false,
        message:
          skipped.length > 0
            ? `Ya había un bloqueo que cubre esa franja en ${skipped
                .map((d) => weekdayLabel(d))
                .join(", ")}.`
            : "No había nada para bloquear.",
      };
    }

    await prisma.$transaction(operations);

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true, count: created };
  } catch (err) {
    console.error("[createRecurringBlockedWeekdays]", err);
    return {
      ok: false,
      message: formatActionError(
        err,
        "No se pudieron bloquear los días de la semana.",
      ),
    };
  }
}

export async function deleteBlockedDay(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = deleteBlockedDaySchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    await prisma.blockedDay.delete({ where: { id: parsed.data.id } });

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true };
  } catch (err) {
    console.error("[deleteBlockedDay]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo desbloquear el día."),
    };
  }
}

export async function deleteRecurringBlockedWeekday(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }
    if (!isPrismaRecurringBlockedWeekdayReady()) {
      return {
        ok: false,
        message:
          "No se pudo completar la acción. Recargá la página e intentá de nuevo.",
      };
    }

    const parsed = deleteRecurringBlockedWeekdaySchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    await prisma.recurringBlockedWeekday.delete({
      where: { id: parsed.data.id },
    });

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true };
  } catch (err) {
    console.error("[deleteRecurringBlockedWeekday]", err);
    return {
      ok: false,
      message: formatActionError(
        err,
        "No se pudo quitar el bloqueo semanal.",
      ),
    };
  }
}

export async function createScheduleBlock(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = createScheduleBlockSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    const startTime = clinicDateTimeToUtc(
      parsed.data.dateStr,
      parsed.data.startTime,
    );
    const endTime = clinicDateTimeToUtc(
      parsed.data.dateStr,
      parsed.data.endTime,
    );

    if (endTime <= startTime) {
      return { ok: false, message: "La hora de fin debe ser posterior al inicio." };
    }

    if (endTime <= new Date()) {
      return { ok: false, message: "No podés bloquear horarios en el pasado." };
    }

    // Mismo criterio que al editar: dos franjas pisadas el mismo día no
    // bloquean nada extra y solo ensucian la lista.
    const overlap = await prisma.scheduleBlock.findFirst({
      where: {
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (overlap) {
      return {
        ok: false,
        message:
          "Ya hay un bloqueo que pisa ese horario. Editá el existente o elegí otro rango.",
      };
    }

    await prisma.scheduleBlock.create({
      data: {
        startTime,
        endTime,
        reason: parsed.data.reason?.trim() || null,
      },
    });

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true };
  } catch (err) {
    console.error("[createScheduleBlock]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo crear el bloqueo."),
    };
  }
}

export async function deleteScheduleBlock(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = deleteScheduleBlockSchema.safeParse(formData);
    if (!parsed.success) return { ok: false, message: "Datos inválidos." };

    await prisma.scheduleBlock.delete({ where: { id: parsed.data.id } });

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true };
  } catch (err) {
    console.error("[deleteScheduleBlock]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo eliminar el bloqueo."),
    };
  }
}


/**
 * Edita un bloqueo de una fecha concreta.
 *
 * Sin esto, corregir un horario obligaba a borrarlo y volver a cargarlo, con el
 * riesgo de dejar el hueco abierto en el medio.
 */
export async function updateScheduleBlock(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }

    const parsed = updateScheduleBlockSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    const startTime = clinicDateTimeToUtc(
      parsed.data.dateStr,
      parsed.data.startTime,
    );
    const endTime = clinicDateTimeToUtc(
      parsed.data.dateStr,
      parsed.data.endTime,
    );

    if (endTime <= startTime) {
      return {
        ok: false,
        message: "La hora de fin debe ser posterior al inicio.",
      };
    }

    const existing = await prisma.scheduleBlock.findUnique({
      where: { id: parsed.data.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, message: "Ese bloqueo ya no existe." };
    }

    // Solaparse con otro bloqueo del mismo día no rompe nada, pero deja la
    // agenda confusa: mejor avisar que dejar dos franjas pisadas.
    const overlap = await prisma.scheduleBlock.findFirst({
      where: {
        id: { not: parsed.data.id },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (overlap) {
      return {
        ok: false,
        message: "Se superpone con otro bloqueo. Ajustá el horario.",
      };
    }

    await prisma.scheduleBlock.update({
      where: { id: parsed.data.id },
      data: {
        startTime,
        endTime,
        reason: parsed.data.reason?.trim() || null,
      },
    });

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true };
  } catch (err) {
    console.error("[updateScheduleBlock]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo editar el bloqueo."),
    };
  }
}

/** Edita una franja fija de un día de la semana (o la pasa a día completo). */
export async function updateRecurringBlockedWeekday(
  formData: unknown,
): Promise<BlockActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, message: "No autorizado." };
    }
    if (!isPrismaRecurringBlockedWeekdayReady()) {
      return {
        ok: false,
        message:
          "No se pudo completar la acción. Recargá la página e intentá de nuevo.",
      };
    }

    const parsed = updateRecurringBlockedWeekdaySchema.safeParse(formData);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }

    const partialReady = isPrismaRecurringBlockedWeekdayPartialReady();
    const startTime = parsed.data.startTime?.trim() || null;
    const endTime = parsed.data.endTime?.trim() || null;
    const isFullDay = !startTime || !endTime;

    if (!isFullDay && toMinutesHhmm(endTime) <= toMinutesHhmm(startTime)) {
      return {
        ok: false,
        message: "La hora de fin debe ser posterior al inicio.",
      };
    }

    if (!isFullDay && !partialReady) {
      return {
        ok: false,
        message:
          "No se pudo guardar esa franja horaria. Recargá la página e intentá de nuevo.",
      };
    }

    const siblings = await prisma.recurringBlockedWeekday.findMany({
      where: { weekday: parsed.data.weekday, id: { not: parsed.data.id } },
      select: partialReady
        ? { id: true, startTime: true, endTime: true }
        : { id: true },
    });

    if (isFullDay) {
      // El día completo reemplaza a todas las franjas sueltas de ese día.
      await prisma.$transaction([
        prisma.recurringBlockedWeekday.deleteMany({
          where: { weekday: parsed.data.weekday, id: { not: parsed.data.id } },
        }),
        prisma.recurringBlockedWeekday.update({
          where: { id: parsed.data.id },
          data: partialReady
            ? {
                reason: parsed.data.reason?.trim() || null,
                startTime: null,
                endTime: null,
              }
            : { reason: parsed.data.reason?.trim() || null },
        }),
      ]);

      revalidatePath("/dashboard/admin/calendar");
      return { ok: true };
    }

    const newStart = toMinutesHhmm(startTime);
    const newEnd = toMinutesHhmm(endTime);

    for (const row of siblings) {
      const otherStart =
        "startTime" in row ? (row.startTime as string | null)?.trim() : null;
      const otherEnd =
        "endTime" in row ? (row.endTime as string | null)?.trim() : null;

      if (!otherStart || !otherEnd) {
        return {
          ok: false,
          message:
            "Ese día está bloqueado completo. Editá ese bloqueo o eliminalo antes de poner franjas.",
        };
      }
      if (
        toMinutesHhmm(otherStart) < newEnd &&
        toMinutesHhmm(otherEnd) > newStart
      ) {
        return {
          ok: false,
          message: `Se superpone con la franja ${otherStart}–${otherEnd}.`,
        };
      }
    }

    await prisma.recurringBlockedWeekday.update({
      where: { id: parsed.data.id },
      data: {
        reason: parsed.data.reason?.trim() || null,
        startTime,
        endTime,
      },
    });

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true };
  } catch (err) {
    console.error("[updateRecurringBlockedWeekday]", err);
    return {
      ok: false,
      message: formatActionError(err, "No se pudo editar el bloqueo."),
    };
  }
}
