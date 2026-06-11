"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { followUpSchema } from "@/lib/validators/follow-up";

export type SubmitFollowUpResult =
  | { ok: true }
  | { ok: false; message: string };

/** Guarda el formulario rápido de seguimiento vinculado a una cita. */
export async function submitFollowUpForm(
  appointmentId: string,
  formData: unknown,
): Promise<SubmitFollowUpResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId: session.user.id,
      flow: "FOLLOW_UP",
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: { followUpSubmission: true },
  });

  if (!appointment) {
    return {
      ok: false,
      message: "Cita no encontrada o no es de seguimiento.",
    };
  }

  if (appointment.followUpSubmission) {
    return { ok: false, message: "Ya enviaste el formulario de seguimiento." };
  }

  const parsed = followUpSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.followUpSubmission.create({
      data: {
        appointmentId,
        currentWeight: data.currentWeight ?? null,
        energyLevel: data.energyLevel,
        adherence: data.adherence,
        symptoms: data.symptoms || null,
        notes: data.notes || null,
      },
    });

    if (data.currentWeight != null) {
      const profile = await tx.patientProfile.findUnique({
        where: { userId: session.user!.id },
      });
      if (profile) {
        await tx.anthropometryMeasurement.create({
          data: {
            patientProfileId: profile.id,
            appointmentId,
            weight: data.currentWeight,
            measuredAt: new Date(),
          },
        });
      }
    }
  });

  revalidatePath("/dashboard/patient/appointments");
  return { ok: true };
}
