"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";

async function syncExistingAppointments(adminUserId: string) {
  const { syncUnsyncedAppointmentsForAdmin } = await import(
    "@/server/services/google-calendar-sync.service"
  );
  return syncUnsyncedAppointmentsForAdmin(adminUserId);
}

export async function setDefaultCalendarAdminAction(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return { ok: false, message: "No autorizado." };
  }

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return {
      ok: false,
      message: "Conectá Google Calendar antes de marcar como calendario principal.",
    };
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { role: "ADMIN", isDefaultCalendarAdmin: true },
      data: { isDefaultCalendarAdmin: false },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { isDefaultCalendarAdmin: true },
    }),
  ]);

  revalidatePath("/dashboard/admin/calendar");
  return { ok: true };
}

export async function syncExistingAppointmentsAction(): Promise<
  | {
      ok: true;
      synced: number;
      failed: number;
      alreadySynced: number;
      skippedPast: number;
    }
  | { ok: false; message: string }
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return { ok: false, message: "No autorizado." };
  }

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: session.user.id },
  });
  if (!connection) {
    return {
      ok: false,
      message: "Conectá Google Calendar antes de sincronizar citas.",
    };
  }

  const { synced, failed, alreadySynced, skippedPast } =
    await syncExistingAppointments(session.user.id);

  revalidatePath("/dashboard/admin/calendar");
  return { ok: true, synced, failed, alreadySynced, skippedPast };
}
