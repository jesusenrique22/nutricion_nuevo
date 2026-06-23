"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { formatActionError } from "@/lib/db-errors";
import { dateRangeKeys, todayDateKey } from "@/lib/scheduling-dates";
import {
  createBlockedDaysSchema,
  createScheduleBlockSchema,
  deleteBlockedDaySchema,
  deleteScheduleBlockSchema,
} from "@/lib/validators/appointment-status";
import { prisma } from "@/server/db/prisma";

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

export type BlockActionResult =
  | { ok: true; count?: number }
  | { ok: false; message: string };

function dateAtTime(dateStr: string, hhmm: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

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

  const today = todayDateKey();
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

    const today = todayDateKey();
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

    const startTime = dateAtTime(parsed.data.dateStr, parsed.data.startTime);
    const endTime = dateAtTime(parsed.data.dateStr, parsed.data.endTime);

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
