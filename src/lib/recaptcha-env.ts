/** Site key pública (cliente + servidor). */
export function getPublicRecaptchaSite(): string {
  return (
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE?.trim() ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
    ""
  );
}

/** Secret key clásica — solo servidor (reCAPTCHA no Enterprise). */
export function getRecaptchaSecret(): string {
  return (
    process.env.RECAPTCHA_SECRET?.trim() ||
    process.env.RECAPTCHA_SECRET_KEY?.trim() ||
    ""
  );
}

/** Enterprise solo si hay credenciales de Google Cloud; si no, v3 clásico (site + secret). */
export function isRecaptchaEnterprise(): boolean {
  return Boolean(getRecaptchaProjectId() && getGoogleCloudApiKey());
}

export function getRecaptchaProjectId(): string {
  return process.env.RECAPTCHA_PROJECT_ID?.trim() ?? "";
}

export function getGoogleCloudApiKey(): string {
  return process.env.GOOGLE_CLOUD_API_KEY?.trim() ?? "";
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(getPublicRecaptchaSite());
}
