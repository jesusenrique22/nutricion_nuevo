type SiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export function recaptchaFailureMessage(
  data: SiteVerifyResponse,
  hostname?: string,
): string {
  const codes = data["error-codes"] ?? [];

  if (codes.includes("invalid-input-secret")) {
    return "Clave secreta de reCAPTCHA incorrecta. Revisá RECAPTCHA_SECRET en .env.";
  }

  if (
    codes.includes("browser-error") ||
    codes.includes("invalid-domain") ||
    codes.includes("hostname-mismatch")
  ) {
    const host = data.hostname ?? hostname ?? "localhost";
    return `reCAPTCHA no pudo validar «${host}». Agregá localhost y 127.0.0.1 en Dominios, desactivá bloqueadores de anuncios e intentá de nuevo.`;
  }

  if (codes.includes("timeout-or-duplicate")) {
    return "La verificación expiró. Intentá agregar al carrito otra vez.";
  }

  if (codes.includes("missing-input-response")) {
    return "No se recibió la verificación de seguridad. Recargá la página e intentá de nuevo.";
  }

  if (
    typeof data.score === "number" &&
    data.success &&
    data.score < 0.5
  ) {
    return "No pudimos confirmar la solicitud. Esperá un momento e intentá otra vez.";
  }

  return "Verificación de seguridad fallida. Revisá que localhost esté en Dominios de Google reCAPTCHA.";
}

export type { SiteVerifyResponse };
