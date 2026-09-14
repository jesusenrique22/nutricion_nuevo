import { prisma } from "@/server/db/prisma";

/** Casilla de la nutricionista: recibe copia de todo aviso operativo. */
export const CLINIC_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "ma.lanzahuerta@gmail.com";

export async function getAdminUserIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

/** Correos de los admins + la casilla de la clínica, sin duplicados. */
export async function getAdminNotificationEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", email: { not: "" } },
    select: { email: true },
  });

  const emails = new Set<string>([CLINIC_NOTIFICATION_EMAIL.toLowerCase()]);
  for (const admin of admins) {
    if (admin.email) emails.add(admin.email.toLowerCase());
  }
  return [...emails];
}
