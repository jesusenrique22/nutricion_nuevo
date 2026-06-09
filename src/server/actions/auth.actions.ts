"use server";

import { randomBytes } from "node:crypto";
import { signOut } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { withDb } from "@/lib/db-errors";
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import {
  passwordResetEmail,
  resetIdentifier,
  verifyEmailMessage,
  verifyIdentifier,
} from "@/lib/email-messages";

const registerSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

const resetSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
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
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }
  const { name, email, password } = parsed.data;

  const existingResult = await withDb(() =>
    prisma.user.findUnique({ where: { email } }),
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

  return sendVerificationEmailToUser(email, name);
}

export async function verifyEmail(
  formData: unknown,
): Promise<AuthActionResult> {
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
  const parsed = resendVerifySchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
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
  const parsed = forgotSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
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
