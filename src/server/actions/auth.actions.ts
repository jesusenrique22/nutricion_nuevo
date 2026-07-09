"use server";

import { randomBytes } from "node:crypto";
import { signOut } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { withDb } from "@/lib/db-errors";
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { assertAuthRateLimit } from "@/lib/security/auth-rate-limit";
import { normalizeEmail } from "@/lib/normalize-email";
import {
  passwordResetEmail,
  passwordResetCodeEmail,
  resetIdentifier,
  verifyEmailMessage,
  verifyIdentifier,
} from "@/lib/email-messages";
import { passwordSchema } from "@/lib/validators/password";

const registerSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  email: z.string().email("Email inválido"),
  password: passwordSchema,
});

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

const resetSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: passwordSchema,
});

const resetWithCodeSchema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
  password: passwordSchema,
});

const verifySchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

const resendVerifySchema = z.object({
  email: z.string().email("Email inválido"),
});

export type AuthActionResult =
  | {
      ok: true;
      devResetUrl?: string;
      devVerifyUrl?: string;
      email?: string;
      skipVerification?: true;
      verificationEmailFailed?: true;
    }
  | { ok: false; message: string };

export type RegisterResult = AuthActionResult;

async function createVerificationToken(
  identifier: string,
  ttlMs: number,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + ttlMs);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return token;
}

function generateNumericCode(): string {
  // 6 dígitos criptográficamente seguros (100000–999999)
  const num = (randomBytes(4).readUInt32BE(0) % 900000) + 100000;
  return num.toString();
}

async function createNumericCodeToken(
  identifier: string,
  ttlMs: number,
): Promise<string> {
  const code = generateNumericCode();
  const expires = new Date(Date.now() + ttlMs);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: code, expires },
  });

  return code;
}

async function sendVerificationEmailToUser(
  email: string,
  name: string,
): Promise<AuthActionResult> {
  const token = await createVerificationToken(
    verifyIdentifier(email),
    24 * 60 * 60 * 1000,
  );

  const verifyPath = `/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  const verifyUrl = absoluteUrl(verifyPath);
  const message = verifyEmailMessage(verifyUrl, name);

  const sent = await sendEmail(
    {
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    },
    verifyPath,
  );

  if (!sent.ok) return sent;

  return {
    ok: true,
    email,
    devVerifyUrl: sent.devPreviewUrl,
  };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function registerPatient(
  formData: unknown,
): Promise<RegisterResult> {
  const rate = await assertAuthRateLimit();
  if (!rate.ok) return rate;

  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }
  const { name, password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  const existingResult = await withDb(() =>
    prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    }),
  );
  if (!existingResult.ok) return existingResult;
  if (existingResult.data) {
    return { ok: false, message: "Ese email ya está registrado." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const emailConfigured = isEmailDeliveryConfigured();

  const createResult = await withDb(() =>
    prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "PATIENT",
        emailVerified: emailConfigured ? null : new Date(),
        patientProfile: {
          create: { hasCompletedIntake: false },
        },
      },
    }),
  );
  if (!createResult.ok) return createResult;

  if (!emailConfigured) {
    return {
      ok: true,
      email,
      skipVerification: true as const,
    };
  }

  const emailResult = await sendVerificationEmailToUser(email, name);
  if (!emailResult.ok) {
    // La cuenta ya existe en la BD; permitir reenvío desde /check-email
    return {
      ok: true,
      email,
      verificationEmailFailed: true as const,
    };
  }

  return emailResult;
}

export async function verifyEmail(
  formData: unknown,
): Promise<AuthActionResult> {
  const rate = await assertAuthRateLimit();
  if (!rate.ok) return rate;

  const parsed = verifySchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: "Enlace inválido." };
  }

  const identifier = verifyIdentifier(parsed.data.email);
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: parsed.data.token,
      expires: { gt: new Date() },
    },
  });

  if (!record) {
    return { ok: false, message: "Enlace inválido o expirado." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: parsed.data.email },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: parsed.data.token,
        },
      },
    }),
  ]);

  return { ok: true };
}

export async function resendVerificationEmail(
  formData: unknown,
): Promise<AuthActionResult> {
  const rate = await assertAuthRateLimit();
  if (!rate.ok) return rate;

  const parsed = resendVerifySchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user || user.role !== "PATIENT" || user.emailVerified) {
    return {
      ok: true,
      email: parsed.data.email,
    };
  }

  if (!isEmailDeliveryConfigured()) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
    return { ok: true, email: parsed.data.email };
  }

  return sendVerificationEmailToUser(parsed.data.email, user.name);
}

export async function requestPasswordReset(
  formData: unknown,
): Promise<AuthActionResult> {
  const rate = await assertAuthRateLimit();
  if (!rate.ok) return rate;

  const parsed = forgotSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!user?.passwordHash) {
    return { ok: true };
  }

  const identifier = resetIdentifier(parsed.data.email);
  const token = await createVerificationToken(identifier, 60 * 60 * 1000);

  const resetPath = `/reset-password?token=${token}&email=${encodeURIComponent(parsed.data.email)}`;
  const resetUrl = absoluteUrl(resetPath);
  const message = passwordResetEmail(resetUrl);

  const sent = await sendEmail(
    {
      to: parsed.data.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    },
    resetPath,
  );

  if (!sent.ok) return sent;

  return {
    ok: true,
    devResetUrl: sent.devPreviewUrl,
  };
}

export async function resetPassword(
  formData: unknown,
): Promise<AuthActionResult> {
  const rate = await assertAuthRateLimit();
  if (!rate.ok) return rate;

  const parsed = resetSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const identifier = resetIdentifier(parsed.data.email);
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: parsed.data.token,
      expires: { gt: new Date() },
    },
  });

  if (!record) {
    return { ok: false, message: "Enlace inválido o expirado." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: parsed.data.email },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: parsed.data.token,
        },
      },
    }),
  ]);

  return { ok: true };
}

// ── Flujo de recuperación con código de 6 dígitos ──────────────────────────

export async function requestPasswordResetCode(
  formData: unknown,
): Promise<AuthActionResult> {
  const rate = await assertAuthRateLimit();
  if (!rate.ok) return rate;

  const parsed = forgotSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  // Siempre responder ok para no revelar si el email existe
  if (!user?.passwordHash) {
    return { ok: true, email };
  }

  const identifier = resetIdentifier(email);
  const code = await createNumericCodeToken(identifier, 15 * 60 * 1000); // 15 min

  const message = passwordResetCodeEmail(code);
  const sent = await sendEmail(
    {
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    },
    // En dev sin SMTP, muestra el código en consola/pantalla como devResetUrl
    `/forgot-password?dev_code=${code}&email=${encodeURIComponent(email)}`,
  );

  if (!sent.ok) return sent;

  return {
    ok: true,
    email,
    devResetUrl: sent.devPreviewUrl,
  };
}

export async function verifyResetCode(formData: unknown): Promise<
  | { ok: true }
  | { ok: false; message: string }
> {
  const schema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
  });
  const parsed = schema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: "Código inválido." };
  }

  const email = normalizeEmail(parsed.data.email);
  const identifier = resetIdentifier(email);
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: parsed.data.code,
      expires: { gt: new Date() },
    },
  });

  if (!record) {
    return { ok: false, message: "Código incorrecto o expirado." };
  }

  return { ok: true };
}

export async function resetPasswordWithCode(
  formData: unknown,
): Promise<AuthActionResult> {
  const rate = await assertAuthRateLimit();
  if (!rate.ok) return rate;

  const parsed = resetWithCodeSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const email = normalizeEmail(parsed.data.email);
  const identifier = resetIdentifier(email);

  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: parsed.data.code,
      expires: { gt: new Date() },
    },
  });

  if (!record) {
    return { ok: false, message: "Código incorrecto o expirado." };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) {
    return { ok: false, message: "No se encontró la cuenta." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token: parsed.data.code } },
    }),
  ]);

  return { ok: true };
}
