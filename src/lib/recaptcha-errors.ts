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

  console.error("[recaptcha] siteverify failed data:", JSON.stringify(data));

  if (codes.length > 0) {
    return `No pudimos verificar la solicitud [${codes.join(", ")}]. Recargá la página e intentá de nuevo.`;
  }

  if (
    typeof data.score === "number" &&
    data.success &&
    data.score < 0.5
  ) {
    return `No pudimos confirmar la solicitud (score: ${data.score}). Esperá un momento e intentá otra vez.`;
  }

  return GENERIC_FAILURE;
}

export type { SiteVerifyResponse };
