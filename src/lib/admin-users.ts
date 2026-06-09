import { prisma } from "@/server/db/prisma";

export async function getAdminUserIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}
