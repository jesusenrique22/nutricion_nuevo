"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { clinicDateTimeToUtc, dateKeyInClinicTz } from "@/lib/clinic-timezone";
import { formatActionError } from "@/lib/db-errors";
import { dateRangeKeys } from "@/lib/scheduling-dates";
import {
  createBlockedDaysSchema,
  createRecurringBlockedWeekdaysSchema,
  createScheduleBlockSchema,
  deleteBlockedDaySchema,
  deleteRecurringBlockedWeekdaySchema,
  deleteScheduleBlockSchema,
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

  // Orden Lun→Dom para la UI
  const order = [1, 2, 3, 4, 5, 6, 0];
  return [...rows]
    .sort((a, b) => order.indexOf(a.weekday) - order.indexOf(b.weekday))
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

    await prisma.$transaction(
      unique.map((weekday) =>
        prisma.recurringBlockedWeekday.upsert({
          where: { weekday },
          create: partialReady
            ? { weekday, reason, startTime, endTime }
            : { weekday, reason },
          update: partialReady
            ? {
                ...(reason ? { reason } : {}),
                startTime,
                endTime,
              }
            : reason
              ? { reason }
              : {},
        }),
      ),
    );

    revalidatePath("/dashboard/admin/calendar");
    return { ok: true, count: unique.length };
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
