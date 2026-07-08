"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { patientAdminResourceSchema } from "@/lib/validators/patient-admin-resource";
import { prisma } from "@/server/db/prisma";

export type PatientAdminResourceResult =
  | { ok: true }
  | { ok: false; message: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session;
}

export async function updatePatientAdminResource(
  patientId: string,
  input: unknown,
): Promise<PatientAdminResourceResult> {
  if (!(await requireAdmin())) {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = patientAdminResourceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: "PATIENT" },
    select: { id: true, patientProfile: { select: { id: true } } },
  });

  if (!patient) {
    return { ok: false, message: "Paciente no encontrado." };
  }

  const url = parsed.data.url || null;
  const note = parsed.data.note?.trim() || null;

  if (patient.patientProfile) {
    await prisma.patientProfile.update({
      where: { id: patient.patientProfile.id },
      data: { adminResourceUrl: url, adminResourceNote: note },
    });
  } else {
    await prisma.patientProfile.create({
      data: {
        userId: patient.id,
        adminResourceUrl: url,
        adminResourceNote: note,
      },
    });
  }

  revalidatePath(`/dashboard/admin/patients/${patientId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
