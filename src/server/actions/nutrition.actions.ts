"use server";
import { revalidatePath } from "next/cache";

import { ConsultationCode } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { withDb } from "@/lib/db-errors";
import { nutritionFormSchema } from "@/lib/validators/nutrition";

export type SubmitNutritionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function submitNutritionForm(
  appointmentId: string,
  formData: unknown,
): Promise<SubmitNutritionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      consultationType: { code: ConsultationCode.NUT_01 },
    },
    include: { nutritionFormSubmission: true, patient: true },
  });

  if (!appointment) {
    return { ok: false, message: "Cita nutricional no encontrada." };
  }
  if (appointment.nutritionFormSubmission) {
    return { ok: false, message: "Ya enviaste este formulario." };
  }

  const parsed = nutritionFormSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;

  const result = await withDb(() =>
    prisma.$transaction([
      prisma.nutritionFormSubmission.create({
        data: {
          appointmentId,
          fullName: data.fullName,
          phone: data.phone,
          gender: data.gender,
          birthDate: new Date(data.birthDate),
          consultationReason: data.consultationReason,
          dietDescription: data.dietDescription || null,
          dietaryRestrictions: data.dietaryRestrictions || null,
          activityLevel: data.activityLevel,
          activityFrequency: data.activityFrequency,
          sportsPracticed: data.sportsPracticed || null,
          reservedSlotNote: data.reservedSlotNote || null,
          continuationPreference: data.continuationPreference || null,
        },
      }),
      prisma.patientProfile.upsert({
        where: { userId: session.user!.id },
        create: {
          userId: session.user!.id,
          birthDate: new Date(data.birthDate),
          gender: data.gender,
          emergencyPhone: data.phone,
          hasCompletedIntake: true,
        },
        update: {
          birthDate: new Date(data.birthDate),
          gender: data.gender,
          emergencyPhone: data.phone,
          hasCompletedIntake: true,
        },
      }),
      prisma.user.update({
        where: { id: session.user!.id },
        data: { phone: data.phone, name: data.fullName },
      }),
    ]),
  );

  if (!result.ok) return result;
  revalidatePath("/dashboard/patient/appointments");
  return { ok: true };
}
