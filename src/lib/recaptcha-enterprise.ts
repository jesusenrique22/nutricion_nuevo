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
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[recaptcha-enterprise] Faltan RECAPTCHA_PROJECT_ID o GOOGLE_CLOUD_API_KEY.",
      );
    }
    return {
      ok: false,
      message: "No pudimos verificar la solicitud. Intentá de nuevo más tarde.",
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
        message: "No pudimos verificar la solicitud. Intentá de nuevo más tarde.",
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
            "No pudimos completar la verificación de seguridad. Desactivá bloqueadores de anuncios, probá en otra red o navegador e intentá de nuevo.",
        };
      }

      if (host && process.env.NODE_ENV === "development") {
        console.warn(
          "[recaptcha-enterprise] dominio no autorizado:",
          host,
          reason,
        );
      }

      return {
        ok: false,
        message:
          "No pudimos verificar la solicitud. Recargá la página e intentá de nuevo.",
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
