"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";

export type PatientListActionResult =
  | { ok: true }
  | { ok: false; message: string };

/** Oculta paciente de la lista admin sin borrar datos. */
export async function hidePatientFromAdminList(
  patientId: string,
): Promise<PatientListActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, message: "No autorizado." };
  }

  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: { id: true, patientProfile: { select: { id: true } } },
  });
  if (!patient) return { ok: false, message: "Paciente no encontrado." };

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
