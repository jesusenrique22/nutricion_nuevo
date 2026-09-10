import nodemailer from "nodemailer";
import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; devPreviewUrl?: string; provider: "resend" | "smtp" | "dev" }
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
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    "https://anttova.com"
  );
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
    (user ? `"Anttova" <${user}>` : `"Anttova" <hola@anttova.com>`);

  return { host, port, secure, user, pass, from, requireTls };
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || getSmtpConfig() !== null);
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
        "No se pudo enviar el correo. Intentá de nuevo en unos minutos.",
    };
  }
}

/** Envía por Resend si RESEND_API_KEY está presente, de lo contrario SMTP, de lo contrario modo dev. */
export async function sendEmail(
  input: SendEmailInput,
  devPreviewPath?: string,
): Promise<SendEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const from = process.env.EMAIL_FROM?.trim() || "Anttova <hola@anttova.com>";
      const { error } = await resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      });

      if (error) {
        console.error("[email/resend]", error);
        return {
          ok: false,
          message: `No se pudo enviar el correo: ${error.message}`,
        };
      }

      return { ok: true, provider: "resend" };
    } catch (err) {
      console.error("[email/resend-exception]", err);
      return {
        ok: false,
        message: "Error enviando correo.",
      };
    }
  }

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

/** Verifica conexión de correo. */
export async function verifySmtpConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (process.env.RESEND_API_KEY?.trim()) {
    return {
      ok: true,
      message: "El servicio de correo con Resend está listo.",
    };
  }

  const config = getSmtpConfig();
  if (!config) {
    return {
      ok: false,
      message: "El envío de correo no está disponible en este momento.",
    };
  }

  try {
    await getTransporter(config).verify();
    return {
      ok: true,
      message: "El correo está configurado correctamente.",
    };
  } catch (err) {
    console.error("[email/verify]", err);
    return {
      ok: false,
      message: "No se pudo verificar el envío de correo. Intentá más tarde.",
    };
  }
}
