import nodemailer from "nodemailer";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; devPreviewUrl?: string; provider: "smtp" | "dev" }
  | { ok: false; message: string };

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  requireTls: boolean;
};

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigKey: string | null = null;

function appBaseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export function absoluteUrl(path: string) {
  return `${appBaseUrl().replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** SMTP propio: VPS (Postfix local), correo del dominio en el hosting, o Gmail gratuito. Sin APIs de pago. */
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? (host === "127.0.0.1" || host === "localhost" ? 25 : 587));
  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;
  const requireTls = process.env.SMTP_REQUIRE_TLS !== "false";

  const from =
    process.env.EMAIL_FROM?.trim() ??
    (user ? `"Anttova" <${user}>` : `"Anttova" <noreply@anttova.local>`);

  return { host, port, secure, user, pass, from, requireTls };
}

export function isEmailDeliveryConfigured(): boolean {
  return getSmtpConfig() !== null;
}

function configCacheKey(config: SmtpConfig) {
  return `${config.host}:${config.port}:${config.user ?? ""}:${config.from}`;
}

function getTransporter(config: SmtpConfig): nodemailer.Transporter {
  const key = configCacheKey(config);
  if (cachedTransporter && cachedConfigKey === key) {
    return cachedTransporter;
  }

  const transportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    ...(config.user
      ? { auth: { user: config.user, pass: config.pass ?? "" } }
      : {}),
    ...(!config.secure && config.requireTls ? { requireTLS: true } : {}),
    ...(process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false"
      ? { tls: { rejectUnauthorized: false } }
      : {}),
  };

  cachedTransporter = nodemailer.createTransport(transportOptions);
  cachedConfigKey = key;
  return cachedTransporter;
}

async function sendViaSmtp(
  config: SmtpConfig,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const transporter = getTransporter(config);

  try {
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    });
    return { ok: true, provider: "smtp" };
  } catch (err) {
    console.error("[email/smtp]", err);
    return {
      ok: false,
      message:
        "No se pudo enviar el correo de verificación. Si estás en producción, configurá SMTP en el hosting (Vercel/Render).",
    };
  }
}

/** Envía por SMTP. Sin config → modo dev (enlace en consola). */
export async function sendEmail(
  input: SendEmailInput,
  devPreviewPath?: string,
): Promise<SendEmailResult> {
  const config = getSmtpConfig();

  if (config) {
    return sendViaSmtp(config, input);
  }

  const previewUrl = devPreviewPath ? absoluteUrl(devPreviewPath) : undefined;
  console.log(`[email/dev] To: ${input.to}`);
  console.log(`[email/dev] Subject: ${input.subject}`);
  if (previewUrl) console.log(`[email/dev] Link: ${previewUrl}`);

  return { ok: true, provider: "dev", devPreviewUrl: previewUrl };
}

/** Verifica conexión SMTP (útil al deploy). */
export async function verifySmtpConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const config = getSmtpConfig();
  if (!config) {
    return {
      ok: false,
      message: "SMTP no configurado (falta SMTP_HOST en .env).",
    };
  }

  try {
    await getTransporter(config).verify();
    return {
      ok: true,
      message: `SMTP OK — ${config.host}:${config.port} (${config.from})`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `SMTP falló: ${msg}` };
  }
}
