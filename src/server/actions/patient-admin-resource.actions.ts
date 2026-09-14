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
    select: {
      id: true,
      name: true,
      email: true,
      patientProfile: {
        select: { id: true, adminResourceUrl: true, adminResourceNote: true },
      },
    },
  });

  if (!patient) {
    return { ok: false, message: "Paciente no encontrado." };
  }

  const url = parsed.data.url || null;
  const note = parsed.data.note?.trim() || null;
  const previousUrl = patient.patientProfile?.adminResourceUrl?.trim() || "";
  const isNewDriveLink = Boolean(url) && url !== previousUrl;

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
  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard");

  if (isNewDriveLink && url) {
    const { notifyPatientDriveMaterialAdded } = await import(
      "@/server/services/patient-drive-notify.service"
    );
    await notifyPatientDriveMaterialAdded({
      patientId: patient.id,
      patientEmail: patient.email,
      patientName: patient.name,
      driveUrl: url,
      note,
    });
  }

  return { ok: true };
}
