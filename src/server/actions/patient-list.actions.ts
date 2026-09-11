"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/security/auth-guards";
import { formatActionError } from "@/lib/db-errors";
import { prisma } from "@/server/db/prisma";
import { removeAppointmentFromGoogleCalendar } from "@/server/services/google-calendar-sync.service";

export type PatientListActionResult =
  | { ok: true }
  | { ok: false; message: string };

async function assertAdminPatient(patientId: string) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false as const, message: "No autorizado." };

  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: {
      id: true,
      email: true,
      patientProfile: { select: { id: true } },
      appointments: {
        select: { id: true },
      },
    },
  });
  if (!patient) return { ok: false as const, message: "Paciente no encontrado." };

  return { ok: true as const, patient, admin };
}

/**
 * Desactiva la cuenta: oculta al paciente del panel, bloquea login y evita
 * re-registro con el mismo email (el registro queda en la base de datos).
 */
export async function hidePatientFromAdminList(
  patientId: string,
): Promise<PatientListActionResult> {
  const check = await assertAdminPatient(patientId);
  if (!check.ok) return check;

  const { patient } = check;

  if (patient.patientProfile) {
    await prisma.patientProfile.update({
      where: { id: patient.patientProfile.id },
      data: { hiddenFromAdminList: true },
    });
  } else {
    await prisma.patientProfile.create({
      data: { userId: patientId, hiddenFromAdminList: true },
    });
  }

  revalidatePath("/dashboard/admin/patients");
  revalidatePath(`/dashboard/admin/patients/${patientId}`);
  return { ok: true };
}

/** Alias explícito para la UI admin. */
export async function deactivatePatientAccount(
  patientId: string,
): Promise<PatientListActionResult> {
  return hidePatientFromAdminList(patientId);
}

/**
 * Borra al paciente y sus datos relacionados de la base de datos.
 * El email queda libre para registrarse de nuevo.
 */
export async function permanentlyDeletePatientAccount(
  patientId: string,
): Promise<PatientListActionResult> {
  try {
    const check = await assertAdminPatient(patientId);
    if (!check.ok) return check;

    const { patient } = check;

    for (const appt of patient.appointments) {
      await removeAppointmentFromGoogleCalendar(appt.id);
    }

    await prisma.$transaction(async (tx) => {
      const appointmentIds = patient.appointments.map((a) => a.id);
      if (appointmentIds.length > 0) {
        await tx.payment.deleteMany({
          where: { appointmentId: { in: appointmentIds } },
        });
      }

      await tx.verificationToken.deleteMany({
        where: { identifier: patient.email },
      });

      await tx.user.delete({ where: { id: patient.id } });
    });

    revalidatePath("/dashboard/admin/patients");
    revalidatePath(`/dashboard/admin/patients/${patientId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: formatActionError(err) };
  }
}

/** Restaura paciente en la lista admin. */
export async function restorePatientToAdminList(
  patientId: string,
): Promise<PatientListActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, message: "No autorizado." };
  }

  await prisma.patientProfile.updateMany({
    where: { userId: patientId },
    data: { hiddenFromAdminList: false },
  });

  revalidatePath("/dashboard/admin/patients");
  return { ok: true };
}
