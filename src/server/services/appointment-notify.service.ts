import { getAdminUserIds } from "@/lib/admin-users";
import { createNotification } from "@/server/services/notification.service";

function fmtDate(iso: Date | string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // Notificaciones no deben bloquear el flujo principal
  }
}

export async function notifyAppointmentBooked(params: {
  patientId: string;
  patientName: string;
  consultationName: string;
  startTime: Date;
  appointmentId: string;
}) {
  await safeNotify(async () => {
    const adminIds = await getAdminUserIds();
    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "APPOINTMENT_REMINDER",
          title: "Nueva cita solicitada",
          body: `${params.patientName} agendó ${params.consultationName} para el ${fmtDate(params.startTime)}.`,
          payload: {
            deepLink: "/dashboard/admin/calendar",
            appointmentId: params.appointmentId,
          },
        }),
      ),
    );
  });
}

export async function notifyAppointmentStatusChange(params: {
  patientId: string;
  consultationName: string;
  startTime: Date;
  status: string;
  appointmentId: string;
}) {
  if (params.status !== "CONFIRMED") return;

  await safeNotify(async () => {
    await createNotification({
      recipientId: params.patientId,
      type: "APPOINTMENT_CONFIRMED",
      title: "Cita confirmada",
      body: `${params.consultationName} · ${fmtDate(params.startTime)}`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });
  });
}

export async function notifyAppointmentCancelled(params: {
  appointmentId: string;
  patientId: string;
  patientName: string;
  consultationName: string;
  startTime: Date;
  cancelledBy: "PATIENT" | "ADMIN";
}) {
  await safeNotify(async () => {
    const when = fmtDate(params.startTime);

    if (params.cancelledBy === "PATIENT") {
      const adminIds = await getAdminUserIds();
      await Promise.all(
        adminIds.map((id) =>
          createNotification({
            recipientId: id,
            type: "APPOINTMENT_CANCELLED",
            title: "Cita cancelada por paciente",
            body: `${params.patientName} canceló ${params.consultationName} (${when}).`,
            payload: {
              deepLink: `/dashboard/admin/patients/${params.patientId}`,
              appointmentId: params.appointmentId,
            },
          }),
        ),
      );
      return;
    }

    await createNotification({
      recipientId: params.patientId,
      type: "APPOINTMENT_CANCELLED",
      title: "Cita cancelada",
      body: `Tu cita de ${params.consultationName} del ${when} fue cancelada por Anttova.`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });
  });
}

export async function notifyPaymentRegistered(_params: {
  patientId: string;
  amount: string;
  consultationName: string;
  appointmentId: string;
}) {
  // Pagos ya no generan notificación al paciente
}

export async function notifyAppointmentReminder(params: {
  patientId: string;
  consultationName: string;
  startTime: Date;
  appointmentId: string;
  patientEmail?: string | null;
  patientName?: string;
}) {
  await safeNotify(async () => {
    await createNotification({
      recipientId: params.patientId,
      type: "APPOINTMENT_REMINDER",
      title: "Recordatorio de cita",
      body: `Mañana tienes ${params.consultationName} a las ${new Date(params.startTime).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}.`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });
  });
}

export async function notifyAppointmentRescheduled(params: {
  patientId: string;
  patientName: string;
  patientEmail?: string | null;
  consultationName: string;
  newStartTime: Date;
  appointmentId: string;
  rescheduledBy: "PATIENT" | "ADMIN";
}) {
  await safeNotify(async () => {
    const when = fmtDate(params.newStartTime);

    if (params.rescheduledBy === "PATIENT") {
      const adminIds = await getAdminUserIds();
      await Promise.all(
        adminIds.map((id) =>
          createNotification({
            recipientId: id,
            type: "APPOINTMENT_REMINDER",
            title: "Cita reagendada por paciente",
            body: `${params.patientName} movió ${params.consultationName} al ${when}.`,
            payload: {
              deepLink: "/dashboard/admin/calendar",
              appointmentId: params.appointmentId,
            },
          }),
        ),
      );
    } else {
      await createNotification({
        recipientId: params.patientId,
        type: "APPOINTMENT_REMINDER",
        title: "Cita reagendada",
        body: `${params.consultationName} · ${when}`,
        payload: {
          deepLink: "/dashboard/patient/appointments",
          appointmentId: params.appointmentId,
        },
      });
    }
  });
}
