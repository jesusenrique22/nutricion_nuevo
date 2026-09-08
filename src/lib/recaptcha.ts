import {
  RECAPTCHA_ACTION_BOOK,
  RECAPTCHA_MIN_SCORE,
} from "@/lib/recaptcha-constants";
import {
  verifyEnterpriseRecaptchaToken,
} from "@/lib/recaptcha-enterprise";
import {
  getPublicRecaptchaSite,
  getRecaptchaSecret,
  isRecaptchaBypassInDev,
  isRecaptchaEnterprise,
} from "@/lib/recaptcha-env";
import {
  recaptchaFailureMessage,
  type SiteVerifyResponse,
} from "@/lib/recaptcha-errors";

export { RECAPTCHA_ACTION_BOOK, RECAPTCHA_MIN_SCORE };

export function isRecaptchaEnabled(): boolean {
  return Boolean(getPublicRecaptchaSite());
}

async function verifyClassicRecaptchaToken(
  token: string,
  expectedAction: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const secret = getRecaptchaSecret();

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token.trim(),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      ok: false,
      message: "No pudimos verificar la solicitud. Intentá de nuevo.",
    };
  }

  const data = (await res.json()) as SiteVerifyResponse;

  if (process.env.NODE_ENV === "development" && !data.success) {
    console.warn("[recaptcha] siteverify failed:", data);
  }

  if (!data.success) {
    return {
      ok: false,
      message: recaptchaFailureMessage(data),
    };
  }

  if (data.action && data.action !== expectedAction) {
    return { ok: false, message: "Verificación de seguridad inválida." };
  }

  if (typeof data.score === "number" && data.score < RECAPTCHA_MIN_SCORE) {
    return {
      ok: false,
      message:
        "No pudimos confirmar la solicitud. Si sos humano, esperá un momento e intentá otra vez.",
    };
  }

  return { ok: true };
}

export async function verifyRecaptchaToken(
  token: string | undefined | null,
  expectedAction: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  // Local: dominios ok no alcanzan si hay bloqueador / PAT 401 / browser-error.
  if (isRecaptchaBypassInDev()) {
    return { ok: true };
  }

  if (!isRecaptchaEnabled()) {
    return { ok: true };
  }

  if (!token?.trim()) {
    return {
      ok: false,
      message: "Verificación de seguridad requerida. Recargá la página e intentá de nuevo.",
    };
  }

  try {
    if (isRecaptchaEnterprise()) {
      return verifyEnterpriseRecaptchaToken(token.trim(), expectedAction);
    }

    if (!getRecaptchaSecret()) {
      if (process.env.NODE_ENV === "development") {
        console.error("[recaptcha] Falta RECAPTCHA_SECRET.");
      }
      return {
        ok: false,
        message: "No pudimos verificar la solicitud. Intentá de nuevo más tarde.",
      };
    }

    return verifyClassicRecaptchaToken(token.trim(), expectedAction);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[recaptcha] verify error:", err);
    }
    return {
      ok: false,
      message: "Error al verificar la solicitud. Intentá de nuevo.",
    };
  }
}
