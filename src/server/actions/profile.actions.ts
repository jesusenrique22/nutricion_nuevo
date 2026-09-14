"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { withDb } from "@/lib/db-errors";
import { isValidE164 } from "@/lib/phone-countries";
import { prisma } from "@/server/db/prisma";
import { syncPatientAndAdmins } from "@/server/realtime/sync";

const updatePhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Ingresá tu número de teléfono")
    .refine(isValidE164, "Número de teléfono inválido"),
});

export type UpdatePhoneResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateMyPhone(
  formData: unknown,
): Promise<UpdatePhoneResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PATIENT") {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = updatePhoneSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Número inválido.",
    };
  }

  const phone = parsed.data.phone;
  const userId = session.user.id;

  const result = await withDb(() =>
    prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { phone },
      }),
      prisma.patientProfile.upsert({
        where: { userId },
        create: {
          userId,
          emergencyPhone: phone,
          hasCompletedIntake: false,
        },
        update: { emergencyPhone: phone },
      }),
    ]),
  );

  if (!result.ok) return result;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/patients");
  revalidatePath(`/dashboard/admin/patients/${userId}`);
  await syncPatientAndAdmins(userId, "patients", { phoneUpdated: true });

  return { ok: true };
}
