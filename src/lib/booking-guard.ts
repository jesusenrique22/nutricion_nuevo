import { headers } from "next/headers";
import { limitByKey } from "@/lib/ratelimit";
import {
  RECAPTCHA_ACTION_BOOK,
  verifyRecaptchaToken,
} from "@/lib/recaptcha";

/** Rate limit + reCAPTCHA antes de crear o agendar citas. */
export async function assertBookingRequestAllowed(
  userId: string,
  recaptchaToken?: string | null,
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

  const captcha = await verifyRecaptchaToken(
    recaptchaToken,
    RECAPTCHA_ACTION_BOOK,
  );
  if (!captcha.ok) return captcha;

  return { ok: true };
}
