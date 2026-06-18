import { RECAPTCHA_MIN_SCORE } from "@/lib/recaptcha-constants";
import {
  getGoogleCloudApiKey,
  getPublicRecaptchaSite,
  getRecaptchaProjectId,
} from "@/lib/recaptcha-env";

type EnterpriseAssessment = {
  tokenProperties?: {
    valid?: boolean;
    invalidReason?: string;
    hostname?: string;
    action?: string;
  };
  riskAnalysis?: {
    score?: number;
  };
};

export function isEnterpriseVerifyConfigured(): boolean {
  return Boolean(getRecaptchaProjectId() && getGoogleCloudApiKey());
}

export async function verifyEnterpriseRecaptchaToken(
  token: string,
  expectedAction: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const projectId = getRecaptchaProjectId();
  const apiKey = getGoogleCloudApiKey();
  const siteKey = getPublicRecaptchaSite();

  if (!projectId || !apiKey) {
    return {
      ok: false,
      message:
        "Faltan RECAPTCHA_PROJECT_ID y GOOGLE_CLOUD_API_KEY en .env para reCAPTCHA Enterprise.",
    };
  }

  try {
    const res = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: {
            token,
            siteKey,
            expectedAction,
          },
        }),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const body = await res.text();
      if (process.env.NODE_ENV === "development") {
        console.warn("[recaptcha-enterprise] assessment HTTP error:", res.status, body);
      }
      return {
        ok: false,
        message: "No pudimos verificar la solicitud con Google Cloud.",
      };
    }

    const data = (await res.json()) as EnterpriseAssessment;

    if (process.env.NODE_ENV === "development" && !data.tokenProperties?.valid) {
      console.warn("[recaptcha-enterprise] assessment failed:", data);
    }

    if (!data.tokenProperties?.valid) {
      const reason = data.tokenProperties?.invalidReason ?? "UNKNOWN";
      const host = data.tokenProperties?.hostname;

      if (reason === "BROWSER_ERROR") {
        return {
          ok: false,
          message:
            "reCAPTCHA no pudo conectarse (bloqueador de anuncios, red o dominio). Desactivá bloqueadores en localhost, agregá 127.0.0.1 en Dominios e intentá de nuevo.",
        };
      }

      if (host) {
        return {
          ok: false,
          message: `El dominio «${host}» no está autorizado. Agregalo en Google reCAPTCHA → Dominios (localhost y 127.0.0.1).`,
        };
      }

      return {
        ok: false,
        message: `Verificación de seguridad fallida (${reason}). Intentá de nuevo.`,
      };
    }

    if (
      data.tokenProperties.action &&
      data.tokenProperties.action !== expectedAction
    ) {
      return { ok: false, message: "Verificación de seguridad inválida." };
    }

    const score = data.riskAnalysis?.score;
    if (typeof score === "number" && score < RECAPTCHA_MIN_SCORE) {
      return {
        ok: false,
        message:
          "No pudimos confirmar la solicitud. Esperá un momento e intentá otra vez.",
      };
    }

    return { ok: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[recaptcha-enterprise] verify error:", err);
    }
    return {
      ok: false,
      message: "Error al verificar la solicitud. Intentá de nuevo.",
    };
  }
}
