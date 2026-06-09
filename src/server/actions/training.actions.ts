"use server";

import { ConsultationCode } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { withDb } from "@/lib/db-errors";
import { trainingFormSchema } from "@/lib/validators/training";

export type SubmitTrainingResult =
  | { ok: true }
  | { ok: false; message: string };

export async function submitTrainingForm(
  appointmentId: string,
  formData: unknown,
): Promise<SubmitTrainingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId: session.user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      consultationType: { code: ConsultationCode.ENT_02 },
    },
    include: { trainingFormSubmission: true },
  });

  if (!appointment) {
    return { ok: false, message: "Cita de entrenamiento no encontrada." };
  }
  if (appointment.trainingFormSubmission) {
    return { ok: false, message: "Ya enviaste este formulario." };
  }

  const parsed = trainingFormSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;

  const result = await withDb(() =>
    prisma.$transaction([
      prisma.trainingFormSubmission.create({
        data: {
          appointmentId,
          consentAccepted: true,
          fullName: data.fullName,
          consultationReason: data.consultationReason || null,
          phone: data.phone,
          gender: data.gender,
          birthDate: new Date(data.birthDate),
          previousAnthropometry: data.previousAnthropometry === "si",
          dominantHand: data.dominantHand,
          dominantFoot: data.dominantFoot,
          activityLevel: data.activityLevel,
          activityFrequency: data.activityFrequency,
          sportsPracticed: data.sportsPracticed || null,
          reportAnalysisTypes: data.reportAnalysisTypes,
          mainObjective: data.mainObjective,
          evaluationFrequency: data.evaluationFrequency,
          reservedSlotNote: data.reservedSlotNote || null,
          procedureQuestions: data.procedureQuestions || null,
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
  return { ok: true };
}
