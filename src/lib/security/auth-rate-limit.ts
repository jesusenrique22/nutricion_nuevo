import { getClientIp } from "@/lib/security/client-ip";
import { limitAuthByIp } from "@/lib/ratelimit";

const AUTH_LIMIT_MESSAGE =
  "Demasiados intentos. Esperá un minuto e intentá de nuevo.";

/** Rate limit para registro, login auxiliar, reset y reenvío de verificación. */
export async function assertAuthRateLimit(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const ip = await getClientIp();
  const { success } = await limitAuthByIp(ip);
  if (!success) {
    return { ok: false, message: AUTH_LIMIT_MESSAGE };
  }
  return { ok: true };
}
