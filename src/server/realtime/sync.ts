import { getAdminUserIds } from "@/lib/admin-users";
import { emitRealtimeUpdate } from "@/server/realtime/emit";
import type { RealtimeScope } from "@/types/realtime";

/** Notifica al paciente y a todas las nutricionistas (ADMIN). */
export async function syncPatientAndAdmins(
  patientId: string,
  scope: RealtimeScope,
  payload?: Record<string, unknown>,
): Promise<void> {
  await emitRealtimeUpdate({
    userIds: [patientId],
    roles: ["ADMIN"],
    scope,
    payload,
  });
}

/** Notifica solo a un usuario concreto. */
export async function syncUser(
  userId: string,
  scope: RealtimeScope,
  payload?: Record<string, unknown>,
): Promise<void> {
  await emitRealtimeUpdate({ userIds: [userId], scope, payload });
}

/** Notifica a todos los administradores. */
export async function syncAdmins(
  scope: RealtimeScope,
  payload?: Record<string, unknown>,
): Promise<void> {
  const adminIds = await getAdminUserIds();
  await emitRealtimeUpdate({
    userIds: adminIds,
    scope,
    payload,
  });
}
