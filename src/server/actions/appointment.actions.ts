"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { limitByKey } from "@/lib/ratelimit";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { validateAppointmentSlot } from "@/server/services/scheduling.service";

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string; flow: "INTAKE" | "FOLLOW_UP" }
  | { ok: false; message: string };

export async function createAppointment(
  formData: unknown,
): Promise<CreateAppointmentResult> {
  // 1) Autenticación
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Debes iniciar sesión." };
  }
  const patientId = session.user.id;

  // 2) Anti-spam: rate limit por IP y por cuenta (Módulo 2)
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-ip";

  const [ipLimit, userLimit] = await Promise.all([
    limitByKey(`ip:${ip}`),
    limitByKey(`user:${patientId}`),
  ]);
  if (!ipLimit.success || !userLimit.success) {
    return {
      ok: false,
      message: "Demasiadas solicitudes. Intenta de nuevo en un minuto.",
    };
  }

  // 3) Validación de entrada
  const parsed = createAppointmentSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, message: "Datos de la cita inválidos." };
  }
  const { consultationTypeId, startTime, modality } = parsed.data;

  const consultationType = await prisma.consultationType.findUnique({
    where: { id: consultationTypeId },
  });
  if (!consultationType) {
    return { ok: false, message: "Tipo de consulta no encontrado." };
  }

  // 4) Reglas de negocio + cruce de horarios
  const validation = await validateAppointmentSlot({
    consultationType,
    startTime: new Date(startTime),
    modality,
  });
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  // 5) Detección de flujo: ¿primera cita (INTAKE) o seguimiento? (Módulo 1)
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: patientId },
    select: { hasCompletedIntake: true },
  });
  const flow = profile?.hasCompletedIntake ? "FOLLOW_UP" : "INTAKE";

  // 6) Persistencia
  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      consultationTypeId,
      startTime: new Date(startTime),
      endTime: validation.endTime,
      modality,
      flow,
      status: "PENDING",
    },
    select: { id: true },
  });

  return { ok: true, appointmentId: appointment.id, flow };
}
