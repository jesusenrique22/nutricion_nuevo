"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { createMeasurementSchema } from "@/lib/validators/measurement";
import { syncPatientAndAdmins } from "@/server/realtime/sync";

export type MeasurementActionResult =
  | { ok: true; measurementId: string }
  | { ok: false; message: string };

export async function createAnthropometryMeasurement(
  formData: unknown,
): Promise<MeasurementActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, message: "No autorizado." };
  }

  const parsed = createMeasurementSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;

  const patient = await prisma.user.findFirst({
    where: { id: data.patientId, role: "PATIENT" },
    include: { patientProfile: true },
  });

  if (!patient?.patientProfile) {
    return { ok: false, message: "Paciente no encontrado." };
  }

  if (data.appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: {
        id: data.appointmentId,
        patientId: data.patientId,
        consultationType: { code: "ANT_03" },
      },
      include: { anthropometryMeasurement: true },
    });
    if (!appt) {
      return { ok: false, message: "Cita de antropometría no válida." };
    }
    if (appt.anthropometryMeasurement) {
      return {
        ok: false,
        message: "Ya hay mediciones registradas para esta cita.",
      };
    }
  }

  const measuredAt = data.measuredAt ? new Date(data.measuredAt) : new Date();

  const measurement = await prisma.anthropometryMeasurement.create({
    data: {
      patientProfileId: patient.patientProfile.id,
      appointmentId: data.appointmentId ?? null,
      measuredAt,
      weight: data.weight ?? null,
      bodyFatPct: data.bodyFatPct ?? null,
      muscleMass: data.muscleMass ?? null,
      waist: data.waist ?? null,
      hip: data.hip ?? null,
      rawData: data.notes ? { notes: data.notes } : undefined,
    },
    select: { id: true },
  });

  revalidatePath(`/dashboard/admin/patients/${data.patientId}`);
  revalidatePath("/dashboard/patient/progress");
  revalidatePath("/dashboard/admin/calendar");

  await syncPatientAndAdmins(data.patientId, "progress", {
    measurementId: measurement.id,
  });

  return { ok: true, measurementId: measurement.id };
}
