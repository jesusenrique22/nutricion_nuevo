"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { intakeFormSchema } from "@/lib/validators/intake";

export type SubmitIntakeResult =
  | { ok: true }
  | { ok: false; message: string };

/** Guarda la anamnesis completa y marca al paciente como intake completado. */
export async function submitIntakeForm(
  appointmentId: string,
  formData: unknown,
): Promise<SubmitIntakeResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId: session.user.id,
      flow: "INTAKE",
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: { patient: { include: { patientProfile: true } } },
  });

  if (!appointment) {
    return { ok: false, message: "Cita no encontrada o no requiere ingreso." };
  }

  const profile = appointment.patient.patientProfile;
  if (!profile) {
    return { ok: false, message: "Perfil de paciente no encontrado." };
  }

  if (profile.hasCompletedIntake) {
    return { ok: false, message: "Ya completaste tu formulario de ingreso." };
  }

  const parsed = intakeFormSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const { profile: prof, ...intake } = parsed.data;

  await prisma.$transaction([
    prisma.patientProfile.update({
      where: { id: profile.id },
      data: {
        birthDate: new Date(prof.birthDate),
        gender: prof.gender,
        height: prof.height,
        occupation: prof.occupation ?? null,
        emergencyPhone: prof.emergencyPhone,
        hasCompletedIntake: true,
      },
    }),
    prisma.intakeForm.create({
      data: {
        patientProfileId: profile.id,
        medicalHistory: intake.medicalHistory,
        allergies: intake.allergies,
        dietaryHabits: intake.dietaryHabits,
        physicalActivity: intake.physicalActivity,
        goals: intake.goals,
        supplementsUse: intake.supplementsUse,
      },
    }),
  ]);

  return { ok: true };
}
