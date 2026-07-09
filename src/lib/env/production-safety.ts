/**
 * Validación de variables de entorno en producción.
 * Evita despliegues rotos (rate limit fail-closed, localhost en prod, OAuth corrupto).
 */

export type EnvCheckLevel = "error" | "warning";

export type EnvCheckIssue = {
  level: EnvCheckLevel;
  code: string;
  message: string;
};

function trim(v: string | undefined): string {
  return v?.trim() ?? "";
}

function isLocalDatabaseUrl(url: string): boolean {
  return (
    /localhost|127\.0\.0\.1/i.test(url) ||
    url.includes(":5432/NutricionSQL")
  );
}

function sanitizeUrl(raw: string): string | null {
  const firstLine = raw.split(/[\r\n]/)[0]?.trim() ?? "";
  const match = firstLine.match(/^https?:\/\/[^\s]+/);
  return match?.[0] ?? null;
}

function baseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/** URL pública del deploy (Vercel inyecta VERCEL_URL / VERCEL_PROJECT_PRODUCTION_URL). */
export function resolveHostingPublicUrl(): string | null {
  const vercelHosts = [
    trim(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    trim(process.env.VERCEL_URL),
  ].filter(Boolean);

  for (const host of vercelHosts) {
    if (isLocalhostUrl(host)) continue;
    return host.startsWith("http") ? baseUrl(host) : `https://${host}`;
  }

  for (const raw of [trim(process.env.AUTH_URL), trim(process.env.NEXTAUTH_URL)]) {
    if (!raw || isLocalhostUrl(raw)) continue;
    return baseUrl(raw);
  }

  return null;
}

/**
 * En hosting serverless, si AUTH_URL/NEXTAUTH_URL faltan o apuntan a localhost,
 * usa el dominio del deploy (p. ej. nutricion-phi.vercel.app).
 */
export function ensureProductionAuthUrls(): void {
  if (process.env.VERCEL !== "1") return;

  const publicUrl = resolveHostingPublicUrl();
  if (!publicUrl) return;

  const next = trim(process.env.NEXTAUTH_URL);
  const auth = trim(process.env.AUTH_URL);

  if (!next || isLocalhostUrl(next)) {
    process.env.NEXTAUTH_URL = publicUrl;
  }
  if (!auth || isLocalhostUrl(auth)) {
    process.env.AUTH_URL = trim(process.env.NEXTAUTH_URL) || publicUrl;
  }
}

/** ¿Estamos en un deploy real (Vercel, CI)? */
export function isProductionDeployContext(): boolean {
  if (process.env.CHECK_PRODUCTION_ENV === "1") return true;
  if (process.env.VERCEL === "1") return true;
  if (process.env.CI === "true" && process.env.NODE_ENV === "production") {
    return true;
  }
  const db = trim(process.env.DATABASE_URL);
  if (db && !isLocalDatabaseUrl(db) && process.env.NODE_ENV === "production") {
    return true;
  }
  return false;
}

export function validateProductionEnvironment(): EnvCheckIssue[] {
  ensureProductionAuthUrls();

  const issues: EnvCheckIssue[] = [];
  const strict = isProductionDeployContext();

  const databaseUrl = trim(process.env.DATABASE_URL);
  const authSecret = trim(process.env.AUTH_SECRET);
  const nextAuthUrl = trim(process.env.NEXTAUTH_URL);
  const authUrl = trim(process.env.AUTH_URL);
  const upstashUrl = trim(process.env.UPSTASH_REDIS_REST_URL);
  const upstashToken = trim(process.env.UPSTASH_REDIS_REST_TOKEN);
  const mongoUri = trim(process.env.MONGODB_URI);
  const gcalRedirect = trim(process.env.GOOGLE_CALENDAR_REDIRECT_URI);
  const gcalClientId = trim(process.env.GOOGLE_CALENDAR_CLIENT_ID);
  const gcalSecret = trim(process.env.GOOGLE_CALENDAR_CLIENT_SECRET);

  if (strict) {
    if (!databaseUrl) {
      issues.push({
        level: "error",
        code: "DATABASE_URL_MISSING",
        message:
          "Falta DATABASE_URL. En Vercel usá la URL pooled de Neon (no localhost).",
      });
    } else if (isLocalDatabaseUrl(databaseUrl)) {
      issues.push({
        level: "error",
        code: "DATABASE_URL_LOCAL",
        message:
          "DATABASE_URL apunta a localhost. En producción debe ser Neon (*.neon.tech).",
      });
    }

    if (!authSecret || authSecret.length < 32) {
      issues.push({
        level: "error",
        code: "AUTH_SECRET_WEAK",
        message:
          "AUTH_SECRET ausente o muy corto. Generá uno: openssl rand -base64 32",
      });
    }

    if (!nextAuthUrl) {
      issues.push({
        level: "error",
        code: "NEXTAUTH_URL_MISSING",
        message:
          "Falta NEXTAUTH_URL con la URL pública del sitio (sin barra final).",
      });
    } else if (isLocalhostUrl(nextAuthUrl)) {
      const auto = resolveHostingPublicUrl();
      if (auto && process.env.VERCEL === "1") {
        issues.push({
          level: "warning",
          code: "NEXTAUTH_URL_LOCAL",
          message:
            `NEXTAUTH_URL apuntaba a localhost; se usará ${auto} en este deploy. Configurá AUTH_URL y NEXTAUTH_URL en el panel del hosting.`,
        });
      } else {
        issues.push({
          level: "error",
          code: "NEXTAUTH_URL_LOCAL",
          message:
            "NEXTAUTH_URL no puede ser localhost en producción. Usá la URL pública del sitio.",
        });
      }
    }

    if (authUrl && nextAuthUrl && baseUrl(authUrl) !== baseUrl(nextAuthUrl)) {
      issues.push({
        level: "error",
        code: "AUTH_URL_MISMATCH",
        message: "AUTH_URL y NEXTAUTH_URL deben ser iguales en producción.",
      });
    }

    if (!authUrl && nextAuthUrl) {
      issues.push({
        level: "warning",
        code: "AUTH_URL_MISSING",
        message:
          "Falta AUTH_URL. Recomendado: mismo valor que NEXTAUTH_URL.",
      });
    }
  }

  if (gcalRedirect) {
    const sanitized = sanitizeUrl(gcalRedirect);
    if (!sanitized || sanitized !== gcalRedirect.split(/[\r\n]/)[0]?.trim()) {
      issues.push({
        level: "error",
        code: "GCAL_REDIRECT_CORRUPT",
        message:
          "GOOGLE_CALENDAR_REDIRECT_URI está corrupta (¿pegaste varias variables en un campo?). Debe ser solo una URL.",
      });
    } else if (
      nextAuthUrl &&
      !sanitized.startsWith(`${baseUrl(nextAuthUrl)}/`)
    ) {
      issues.push({
        level: "warning",
        code: "GCAL_REDIRECT_MISMATCH",
        message:
          "GOOGLE_CALENDAR_REDIRECT_URI no coincide con NEXTAUTH_URL. Debe ser {NEXTAUTH_URL}/api/google/calendar/callback",
      });
    }
  }

  const hasUpstash = Boolean(upstashUrl && upstashToken);
  const partialUpstash = Boolean(upstashUrl || upstashToken) && !hasUpstash;
  if (partialUpstash) {
    issues.push({
      level: "error",
      code: "UPSTASH_PARTIAL",
      message:
        "Configurá ambas: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (o ninguna).",
    });
  } else if (strict && !hasUpstash) {
    issues.push({
      level: "warning",
      code: "UPSTASH_MISSING",
      message:
        "Sin Upstash: rate limit en memoria (OK con 1 instancia). Recomendado gratis en console.upstash.com.",
    });
  }

  if (strict && !mongoUri) {
    const onVercel = process.env.VERCEL === "1";
    issues.push({
      level: onVercel ? "error" : "warning",
      code: "MONGODB_MISSING",
      message: onVercel
        ? "Falta MONGODB_URI. En Vercel es obligatorio para subir imágenes, PDFs y comprobantes (GridFS en Atlas)."
        : "Falta MONGODB_URI. En local los uploads usan disco; en Vercel hace falta Atlas (GridFS).",
    });
  }

  if ((gcalClientId && !gcalSecret) || (!gcalClientId && gcalSecret)) {
    issues.push({
      level: "warning",
      code: "GCAL_PARTIAL",
      message:
        "Google Calendar: configurá CLIENT_ID y CLIENT_SECRET juntos o ninguno.",
    });
  }

  return issues;
}

export function formatEnvCheckReport(issues: EnvCheckIssue[]): string {
  if (issues.length === 0) {
    return "✓ Variables de producción OK";
  }
  const lines = ["\n═══ Revisión de entorno de producción ═══\n"];
  for (const issue of issues) {
    const tag = issue.level === "error" ? "✗ ERROR" : "⚠ AVISO";
    lines.push(`${tag} [${issue.code}] ${issue.message}`);
  }
  lines.push("");
  return lines.join("\n");
}

/** Log en arranque del servidor (no tumba el proceso). */
export function logProductionConfigOnStartup(): void {
  if (process.env.NODE_ENV !== "production") return;

  const issues = validateProductionEnvironment();
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  if (errors.length > 0) {
    console.error(formatEnvCheckReport(errors));
    console.error(
      "[env] Hay errores de configuración. Login, citas u OAuth pueden fallar.",
    );
  }
  if (warnings.length > 0) {
    console.warn(formatEnvCheckReport(warnings));
  }
}
