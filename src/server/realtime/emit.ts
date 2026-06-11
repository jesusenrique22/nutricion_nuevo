import type { RealtimeScope } from "@/types/realtime";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
const SOCKET_SECRET = process.env.SOCKET_INTERNAL_SECRET ?? "";

async function postSocketEmit(body: {
  event: string;
  data?: Record<string, unknown>;
  userIds?: string[];
  roles?: Array<"ADMIN" | "PATIENT">;
}): Promise<void> {
  if (!body.userIds?.length && !body.roles?.length) return;
  if (!SOCKET_URL || !SOCKET_SECRET) return;

  try {
    const res = await fetch(`${SOCKET_URL}/internal/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SOCKET_SECRET}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn(`[realtime] emit falló (${res.status})`);
    }
  } catch {
    // El servidor socket es opcional; no bloquear mutaciones si no está activo.
  }
}

/** Emite un evento de actualización a usuarios/roles conectados vía Socket.io. */
export async function emitRealtimeUpdate(params: {
  userIds?: string[];
  roles?: Array<"ADMIN" | "PATIENT">;
  scope: RealtimeScope;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { userIds, roles, scope, payload } = params;
  await postSocketEmit({
    event: "dashboard:update",
    data: { scope, ...payload },
    userIds,
    roles,
  });
}

/** Emite un evento socket arbitrario (p. ej. toast de mensaje entrante). */
export async function emitSocketEvent(params: {
  userIds?: string[];
  roles?: Array<"ADMIN" | "PATIENT">;
  event: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  await postSocketEmit(params);
}
