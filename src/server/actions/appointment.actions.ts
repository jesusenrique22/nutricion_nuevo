"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { limitByKey } from "@/lib/ratelimit";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { validateAppointmentSlot } from "@/server/services/scheduling.service";
import { syncPatientAndAdmins } from "@/server/realtime/sync";
import { notifyAppointmentBooked } from "@/server/services/appointment-notify.service";
import { getPaymentChatPolicy } from "@/lib/payment-chat-policy";
import { buildPaymentCreateData } from "@/lib/payment-split";

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

  // 6) Persistencia + registro de pago manual pendiente (adelanto + saldo)
  const paymentPolicy = await getPaymentChatPolicy();

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
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

    await tx.payment.create({
      data: {
        appointmentId: created.id,
        ...buildPaymentCreateData({
          totalPrice: consultationType.price,
          policy: paymentPolicy,
        }),
      },
    });

    return created;
  });

  await notifyAppointmentBooked({
    patientId,
    patientName: session.user.name ?? "Paciente",
    consultationName: consultationType.name,
    startTime: new Date(startTime),
    appointmentId: appointment.id,
  });

  revalidatePath("/dashboard/patient/appointments");
  revalidatePath("/dashboard/admin/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/chat");

  await syncPatientAndAdmins(patientId, "appointments", {
    appointmentId: appointment.id,
  });

  return { ok: true, appointmentId: appointment.id, flow };
}
