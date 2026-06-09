"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { upsertWeeklyPlanSchema } from "@/lib/validators/cms";
import { prisma } from "@/server/db/prisma";
import type { WeeklyDayPlan, WeeklyPlanData } from "@/types/weekly-plan";

export type WeeklyPlanActionResult =
  | { ok: true }
  | { ok: false; message: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

function mapPlan(row: {
  id: string;
  title: string;
  weekLabel: string | null;
  imageUrl: string | null;
  notes: string | null;
  days: unknown;
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
}): WeeklyPlanData {
  return {
    id: row.id,
    title: row.title,
    weekLabel: row.weekLabel,
    imageUrl: row.imageUrl,
    notes: row.notes,
    days: row.days as WeeklyDayPlan[],
    isPublished: row.isPublished,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getWeeklyPlanForPatientAdmin(
  patientId: string,
): Promise<WeeklyPlanData | null> {
  if (!(await requireAdmin())) return null;

  const row = await prisma.patientWeeklyPlan.findFirst({
    where: { patientId },
    orderBy: { updatedAt: "desc" },
  });

  return row ? mapPlan(row) : null;
}

export async function getPublishedWeeklyPlanForPatient(
  patientId: string,
): Promise<WeeklyPlanData | null> {
  const row = await prisma.patientWeeklyPlan.findFirst({
    where: { patientId, isPublished: true },
    orderBy: { updatedAt: "desc" },
  });

  return row ? mapPlan(row) : null;
}

export async function upsertWeeklyPlan(
  formData: unknown,
): Promise<WeeklyPlanActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = upsertWeeklyPlanSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;
  const daysJson = data.days as unknown as Prisma.InputJsonValue;

  if (data.planId) {
    await prisma.patientWeeklyPlan.update({
      where: { id: data.planId },
      data: {
        title: data.title,
        weekLabel: data.weekLabel ?? null,
        imageUrl: data.imageUrl || null,
        notes: data.notes ?? null,
        days: daysJson,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
  } else {
    await prisma.patientWeeklyPlan.create({
      data: {
        patientId: data.patientId,
        title: data.title,
        weekLabel: data.weekLabel ?? null,
        imageUrl: data.imageUrl || null,
        notes: data.notes ?? null,
        days: daysJson,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
  }

  revalidatePath(`/dashboard/admin/patients/${data.patientId}`);
  revalidatePath("/dashboard/patient/library");
  return { ok: true };
}
