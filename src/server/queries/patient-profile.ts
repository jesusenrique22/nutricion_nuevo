import { prisma } from "@/server/db/prisma";

/** Paciente desactivado por admin (no puede usar el dashboard). */
export async function isPatientDeactivated(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ hidden: boolean }[]>`
      SELECT COALESCE("hiddenFromAdminList", false) AS hidden
      FROM "PatientProfile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    return rows[0]?.hidden ?? false;
  } catch {
    return false;
  }
}
