"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { withDb } from "@/lib/db-errors";

const registerSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type RegisterResult =
  | { ok: true }
  | { ok: false; message: string };

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

  const createResult = await withDb(() =>
    prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "PATIENT",
        patientProfile: {
          create: { hasCompletedIntake: false },
        },
      },
    }),
  );
  if (!createResult.ok) return createResult;

  return { ok: true };
}
