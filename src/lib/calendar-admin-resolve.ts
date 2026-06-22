import { prisma } from "@/server/db/prisma";

/**
 * Admin que debe recibir nuevas citas en Google Calendar.
 * Prioridad: marcado como default → único admin con calendario conectado → único ADMIN.
 */
export async function resolveCalendarAdminIdForNewAppointment(): Promise<string | null> {
  const defaultAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", isDefaultCalendarAdmin: true },
    select: { id: true },
  });
  if (defaultAdmin) return defaultAdmin.id;

  const connectedAdmins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      googleCalendarConnection: { isNot: null },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (connectedAdmins.length === 1) return connectedAdmins[0]!.id;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (admins.length === 1) return admins[0]!.id;

  return null;
}

/** Si no hay default y este admin conecta calendario, lo marca como receptor de citas. */
export async function ensureDefaultCalendarAdmin(userId: string): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { role: "ADMIN", isDefaultCalendarAdmin: true },
    select: { id: true },
  });
  if (existing) return;

  await prisma.user.updateMany({
    where: { id: userId, role: "ADMIN" },
    data: { isDefaultCalendarAdmin: true },
  });
}
