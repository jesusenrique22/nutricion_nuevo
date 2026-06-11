import { getAdminUserIds } from "@/lib/admin-users";
import { createNotification } from "@/server/actions/notification.actions";

function fmtDate(iso: Date | string) {
  return new Date(iso).toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function safeNotify(
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch {
    // MongoDB opcional: no bloquear flujo de citas
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
    await createNotification({ _serverOnly: true,
      recipientId: params.patientId,
      type: "SYSTEM",
      title: "Cita solicitada",
      body: `Tu cita de ${params.consultationName} el ${fmtDate(params.startTime)} está pendiente de confirmación.`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });

    const adminIds = await getAdminUserIds();
    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          _serverOnly: true,
          recipientId: id,
          type: "SYSTEM",
          title: "Nueva cita",
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
  const titles: Record<string, string> = {
    CONFIRMED: "Cita confirmada",
    CANCELLED: "Cita cancelada",
    COMPLETED: "Cita completada",
    NO_SHOW: "Cita marcada como no asistió",
  };
  const title = titles[params.status];
  if (!title) return;

  await safeNotify(async () => {
    await createNotification({ _serverOnly: true,
      recipientId: params.patientId,
      type: params.status === "CONFIRMED" ? "APPOINTMENT_REMINDER" : "SYSTEM",
      title,
      body: `${params.consultationName} · ${fmtDate(params.startTime)}`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });
  });
}

export async function notifyPaymentRegistered(params: {
  patientId: string;
  amount: string;
  consultationName: string;
  appointmentId: string;
}) {
  await safeNotify(async () => {
    await createNotification({ _serverOnly: true,
      recipientId: params.patientId,
      type: "PAYMENT",
      title: "Pago registrado",
      body: `Se registró el pago de $${params.amount} por ${params.consultationName}.`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });
  });
}

export async function notifyAppointmentReminder(params: {
  patientId: string;
  consultationName: string;
  startTime: Date;
  appointmentId: string;
}) {
  await safeNotify(async () => {
    await createNotification({ _serverOnly: true,
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
