import { headers } from "next/headers";
import { limitByKey } from "@/lib/ratelimit";

/**
 * Rate limit antes de crear o agendar citas.
 * reCAPTCHA fue removido: los usuarios ya están autenticados (requirePatient)
 * y el rate limiting por IP + usuario es protección suficiente.
 */
export async function assertBookingRequestAllowed(
  userId: string,
  _recaptchaToken?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-ip";

  const [ipLimit, userLimit] = await Promise.all([
    limitByKey(`ip:${ip}`),
    limitByKey(`user:${userId}`),
  ]);

  if (!ipLimit.success || !userLimit.success) {
    return {
      ok: false,
      message: "Demasiadas solicitudes. Intentá de nuevo en un minuto.",
    };
  }

  return { ok: true };
}
