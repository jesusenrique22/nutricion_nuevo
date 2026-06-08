import { ConsultationType, ConsultationModality } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type SchedulingError =
  | "MODALITY_NOT_ALLOWED"
  | "OUTSIDE_MORNING_WINDOW"
  | "TIME_SLOT_TAKEN"
  | "INVALID_TIME";

export type ValidationResult =
  | { ok: true; endTime: Date }
  | { ok: false; error: SchedulingError; message: string };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Valida una solicitud de cita contra TODAS las reglas de negocio (Módulo 1 y 2):
 *  - Modalidad permitida por el tipo de consulta (ANT_03 solo presencial).
 *  - Ventana matutina obligatoria para consultas morningOnly (ANT_03 08:00-12:00).
 *  - Sin cruce de horarios con otras citas activas (consulta a PostgreSQL).
 */
export async function validateAppointmentSlot(params: {
  consultationType: ConsultationType;
  startTime: Date;
  modality: ConsultationModality;
}): Promise<ValidationResult> {
  const { consultationType, startTime, modality } = params;

  if (Number.isNaN(startTime.getTime())) {
    return { ok: false, error: "INVALID_TIME", message: "Fecha inválida." };
  }

  // 1) Modalidad permitida
  if (modality === "ONLINE" && !consultationType.allowsOnline) {
    return {
      ok: false,
      error: "MODALITY_NOT_ALLOWED",
      message: `${consultationType.name} no admite modalidad online.`,
    };
  }
  if (modality === "PRESENCIAL" && !consultationType.allowsPresencial) {
    return {
      ok: false,
      error: "MODALITY_NOT_ALLOWED",
      message: `${consultationType.name} no admite modalidad presencial.`,
    };
  }

  const endTime = new Date(
    startTime.getTime() + consultationType.durationMinutes * 60_000,
  );

  // 2) Ventana matutina obligatoria (ANT_03)
  if (consultationType.morningOnly) {
    const start = consultationType.morningStart ?? "08:00";
    const end = consultationType.morningEnd ?? "12:00";
    const startMin = startTime.getHours() * 60 + startTime.getMinutes();
    const endMin = endTime.getHours() * 60 + endTime.getMinutes();

    if (startMin < toMinutes(start) || endMin > toMinutes(end)) {
      return {
        ok: false,
        error: "OUTSIDE_MORNING_WINDOW",
        message: `${consultationType.name} solo se agenda entre ${start} y ${end}.`,
      };
    }
  }

  // 3) Validación estricta de cruce de horarios (overlap)
  const overlap = await prisma.appointment.findFirst({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });

  if (overlap) {
    return {
      ok: false,
      error: "TIME_SLOT_TAKEN",
      message: "Ese bloque horario ya está ocupado.",
    };
  }

  return { ok: true, endTime };
}
