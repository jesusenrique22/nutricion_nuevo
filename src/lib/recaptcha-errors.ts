type SiteVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

const GENERIC_FAILURE =
  "No pudimos verificar la solicitud. Recargá la página e intentá de nuevo.";

const BROWSER_FAILURE =
  "No pudimos completar la verificación de seguridad. Desactivá bloqueadores de anuncios, probá en otra red o navegador e intentá de nuevo.";

export function recaptchaFailureMessage(
  data: SiteVerifyResponse,
  _hostname?: string,
): string {
  const codes = data["error-codes"] ?? [];

  if (process.env.NODE_ENV === "development") {
    console.warn("[recaptcha] siteverify failed:", data);
  }

  if (codes.includes("invalid-input-secret")) {
    return GENERIC_FAILURE;
  }

  if (
    codes.includes("browser-error") ||
    codes.includes("invalid-domain") ||
    codes.includes("hostname-mismatch")
  ) {
    return BROWSER_FAILURE;
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

  return GENERIC_FAILURE;
}

export type { SiteVerifyResponse };
