import { CLINIC_NOTIFICATION_EMAIL, getAdminUserIds } from "@/lib/admin-users";
import { createNotification } from "@/server/services/notification.service";
import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import {
  formatClinicDateTime,
  formatClinicDateTimeLong,
  formatClinicTime,
} from "@/lib/clinic-timezone";
import { prisma } from "@/server/db/prisma";

const fmtDate = formatClinicDateTime;

async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("[appointment-notify] Error en notificación:", err);
  }
}

export async function notifyAppointmentBooked(params: {
  patientId: string;
  patientName: string;
  consultationName: string;
  startTime: Date;
  appointmentId: string;
  /**
   * `true` cuando la reserva queda sujeta a que se apruebe el pago. En ese caso
   * NO se le dice al paciente que la cita está confirmada: recibe un aviso de
   * «solicitud recibida» y la confirmación real llega con
   * `notifyAppointmentStatusChange` al aprobarse el adelanto.
   */
  awaitingPayment?: boolean;
}) {
  const awaitingPayment = params.awaitingPayment ?? false;

  await safeNotify(async () => {
    const adminIds = await getAdminUserIds();
    const calendarUrl = `/dashboard/admin/calendar?appointmentId=${params.appointmentId}`;
    const adminTitle = awaitingPayment
      ? "Nueva cita a la espera de pago"
      : "Nueva cita solicitada";
    const adminBody = awaitingPayment
      ? `${params.patientName} reservó ${params.consultationName} para el ${fmtDate(params.startTime)}. Queda pendiente de aprobar el pago.`
      : `${params.patientName} agendó ${params.consultationName} para el ${fmtDate(params.startTime)}.`;

    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "APPOINTMENT_REMINDER",
          title: adminTitle,
          body: adminBody,
          payload: {
            deepLink: awaitingPayment ? "/dashboard/admin/payments" : calendarUrl,
            appointmentId: params.appointmentId,
            patientId: params.patientId,
            calendarLink: calendarUrl,
          },
        }),
      ),
    );

    // Aviso en la app al paciente: refleja el estado real de la reserva.
    await createNotification({
      recipientId: params.patientId,
      type: awaitingPayment ? "PURCHASE_STATUS" : "APPOINTMENT_CONFIRMED",
      title: awaitingPayment
        ? "Reserva recibida · pago en revisión"
        : "Cita agendada",
      body: awaitingPayment
        ? `Guardamos tu horario para ${params.consultationName} el ${fmtDate(params.startTime)}. Queda confirmado apenas verifiquemos tu pago.`
        : `${params.consultationName} · ${fmtDate(params.startTime)}`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
        stage: awaitingPayment ? "IN_REVIEW" : "APPROVED",
      },
    });

    if (isEmailDeliveryConfigured()) {
      const when = formatClinicDateTimeLong(params.startTime);

      // 1. Notificación a la Nutricionista
      await sendEmail({
        to: CLINIC_NOTIFICATION_EMAIL,
        subject: awaitingPayment
          ? `Anttova — Nueva reserva pendiente de pago: ${params.patientName}`
          : `Anttova — Nueva cita agendada: ${params.patientName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
            <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
            <h1 style="font-size:20px;font-weight:600;color:#5a1728">${adminTitle}</h1>
            <p>Hola Licenciada, se ha registrado una nueva cita en la plataforma:</p>
            <div style="background:#f9f5f6;border-left:4px solid #5a1728;padding:16px;margin:20px 0;border-radius:4px">
              <p style="margin:4px 0"><strong>Paciente:</strong> ${params.patientName}</p>
              <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
              <p style="margin:4px 0"><strong>Fecha y Hora:</strong> ${when}</p>
              ${awaitingPayment ? `<p style="margin:4px 0"><strong>Estado:</strong> pendiente de aprobar el pago</p>` : ""}
            </div>
            <p style="margin:24px 0">
              <a href="${absoluteUrl(awaitingPayment ? "/dashboard/admin/payments" : calendarUrl)}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                ${awaitingPayment ? "Revisar el pago" : "Ver cita en el calendario"}
              </a>
            </p>
          </div>
        `,
        text: `${adminTitle} en Anttova:\nPaciente: ${params.patientName}\nConsulta: ${params.consultationName}\nFecha: ${when}\nVer: ${absoluteUrl(awaitingPayment ? "/dashboard/admin/payments" : calendarUrl)}`,
      });

      // 2. Correo al paciente — acuse de reserva, no confirmación, si falta pagar
      const patient = await prisma.user.findUnique({
        where: { id: params.patientId },
        select: { email: true, name: true },
      });

      if (patient?.email) {
        const patientName = patient.name || params.patientName || "Estimado/a";
        const heading = awaitingPayment
          ? "Recibimos tu reserva"
          : "¡Tu cita ha sido agendada con éxito!";
        const intro = awaitingPayment
          ? `Hola ${patientName}, guardamos tu horario mientras verificamos el pago:`
          : `Hola ${patientName}, registramos tu solicitud de turno en Anttova:`;
        const note = awaitingPayment
          ? "Tu turno quedará <strong>confirmado</strong> apenas verifiquemos tu comprobante. Te enviaremos un correo en cuanto esté listo."
          : "Podés revisar el estado de tu turno, información previa o acceder a la plataforma desde tu panel.";

        await sendEmail({
          to: patient.email,
          subject: awaitingPayment
            ? `Anttova — Recibimos tu reserva: ${params.consultationName}`
            : `Anttova — Confirmación de tu turno: ${params.consultationName}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
              <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
              <h1 style="font-size:20px;font-weight:600;color:#5a1728">${heading}</h1>
              <p>${intro}</p>
              <div style="background:#f9f5f6;border-left:4px solid #5a1728;padding:16px;margin:20px 0;border-radius:4px">
                <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
                <p style="margin:4px 0"><strong>Fecha y Hora:</strong> ${when}</p>
                <p style="margin:4px 0"><strong>Profesional:</strong> Lic. Ma Antonieta Lanza</p>
                ${awaitingPayment ? `<p style="margin:4px 0"><strong>Estado actual:</strong> pago en revisión</p>` : ""}
              </div>
              <p style="font-size:14px;color:#555">${note}</p>
              <p style="margin:24px 0">
                <a href="${absoluteUrl("/dashboard/patient/appointments")}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                  Ver mi cita en el panel
                </a>
              </p>
            </div>
          `,
          text: `${heading}\nHola ${patientName},\nConsulta: ${params.consultationName}\nFecha y Hora: ${when}\nProfesional: Lic. Ma Antonieta Lanza${awaitingPayment ? "\nEstado actual: pago en revisión (te avisamos al confirmar)" : ""}\nVer detalles: ${absoluteUrl("/dashboard/patient/appointments")}`,
        });
      }
    }
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

    if (isEmailDeliveryConfigured()) {
      const patient = await prisma.user.findUnique({
        where: { id: params.patientId },
        select: { email: true, name: true },
      });

      if (patient?.email) {
        const patientName = patient.name || "Estimado/a";
        const when = formatClinicDateTimeLong(params.startTime);

        await sendEmail({
          to: patient.email,
          subject: `Anttova — ¡Tu cita fue confirmada! 🎉`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
              <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
              <h1 style="font-size:20px;font-weight:600;color:#15803d">¡Tu turno fue confirmado! 🎉</h1>
              <p>Hola ${patientName}, la Lic. Ma Antonieta Lanza ha confirmado tu turno de consulta:</p>
              <div style="background:#f0fdf4;border-left:4px solid #15803d;padding:16px;margin:20px 0;border-radius:4px">
                <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
                <p style="margin:4px 0"><strong>Fecha y Hora:</strong> ${when}</p>
                <p style="margin:4px 0"><strong>Profesional:</strong> Lic. Ma Antonieta Lanza</p>
              </div>
              <p style="font-size:14px;color:#555">Tu lugar está asegurado. Ingresá a tu panel para ver más detalles.</p>
              <p style="margin:24px 0">
                <a href="${absoluteUrl("/dashboard/patient/appointments")}" style="background:#15803d;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                  Ir a mis citas
                </a>
              </p>
            </div>
          `,
          text: `¡Tu cita fue confirmada!\nHola ${patientName},\nTu consulta de ${params.consultationName} para el ${when} ha sido confirmada por la profesional.\nVer: ${absoluteUrl("/dashboard/patient/appointments")}`,
        });
      }
    }
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
              deepLink: `/dashboard/admin/calendar?appointmentId=${params.appointmentId}`,
              appointmentId: params.appointmentId,
              patientId: params.patientId,
            },
          }),
        ),
      );
    } else {
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
    }

    if (isEmailDeliveryConfigured()) {
      const patient = await prisma.user.findUnique({
        where: { id: params.patientId },
        select: { email: true, name: true },
      });

      if (patient?.email) {
        const patientName = patient.name || params.patientName || "Estimado/a";
        const subject =
          params.cancelledBy === "ADMIN"
            ? `Anttova — Cita cancelada: ${params.consultationName}`
            : `Anttova — Confirmación de cancelación de turno`;

        await sendEmail({
          to: patient.email,
          subject,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
              <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
              <h1 style="font-size:20px;font-weight:600;color:#dc2626">Cita cancelada</h1>
              <p>Hola ${patientName}, ${
                params.cancelledBy === "ADMIN"
                  ? "tu cita ha sido cancelada por la administración de Anttova."
                  : "confirmamos que tu cita ha sido cancelada exitosamente."
              }</p>
              <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:4px">
                <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
                <p style="margin:4px 0"><strong>Fecha:</strong> ${when}</p>
              </div>
              <p style="font-size:14px;color:#555">Si deseás elegir un nuevo horario, podés agendarlo desde la plataforma cuando gustes.</p>
              <p style="margin:24px 0">
                <a href="${absoluteUrl("/dashboard/patient/appointments")}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                  Agendar nuevo turno
                </a>
              </p>
            </div>
          `,
          text: `Cita cancelada\nHola ${patientName},\nConsulta: ${params.consultationName}\nFecha: ${when}\nAgendar nuevo turno: ${absoluteUrl("/dashboard/patient/appointments")}`,
        });
      }

      // También avisar por email a la nutricionista si canceló el paciente
      if (params.cancelledBy === "PATIENT") {
        await sendEmail({
          to: CLINIC_NOTIFICATION_EMAIL,
          subject: `Anttova — Cita cancelada por paciente: ${params.patientName}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
              <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
              <h1 style="font-size:20px;font-weight:600;color:#dc2626">Cita cancelada por paciente</h1>
              <p>El paciente <strong>${params.patientName}</strong> canceló su cita:</p>
              <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:4px">
                <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
                <p style="margin:4px 0"><strong>Fecha:</strong> ${when}</p>
              </div>
            </div>
          `,
          text: `Cita cancelada por paciente: ${params.patientName}\nConsulta: ${params.consultationName}\nFecha: ${when}`,
        });
      }
    }
  });
}

/**
 * Admin registró un pago de la consulta. Avisa al paciente el estado en que
 * queda la consulta (adelanto acreditado / saldo acreditado / pago completo).
 *
 * No se llama cuando el pago además confirma la cita: en ese caso el aviso lo
 * emite `notifyAppointmentStatusChange` para no duplicar mensajes.
 */
export async function notifyPaymentRegistered(params: {
  patientId: string;
  amount: string;
  consultationName: string;
  appointmentId: string;
  phase: "advance" | "remainder" | "full";
  /** `true` cuando ya no queda nada por pagar. */
  fullyPaid: boolean;
}) {
  await safeNotify(async () => {
    const phaseLabel =
      params.phase === "advance"
        ? "adelanto"
        : params.phase === "remainder"
          ? "saldo"
          : "pago";
    const stateLabel = params.fullyPaid
      ? "Pagada por completo"
      : "Pago parcial acreditado";

    await createNotification({
      recipientId: params.patientId,
      type: "PURCHASE_STATUS",
      title: `Pago acreditado · ${stateLabel}`,
      body: params.fullyPaid
        ? `Confirmamos tu ${phaseLabel} de ${params.consultationName}. La consulta queda paga en su totalidad.`
        : `Confirmamos tu ${phaseLabel} de ${params.consultationName}. Te avisaremos por el resto del pago.`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
        stage: params.fullyPaid ? "APPROVED" : "IN_REVIEW",
      },
    });

    if (!isEmailDeliveryConfigured()) return;

    const patient = await prisma.user.findUnique({
      where: { id: params.patientId },
      select: { email: true, name: true },
    });
    if (!patient?.email) return;

    const href = absoluteUrl("/dashboard/patient/appointments");
    await sendEmail({
      to: patient.email,
      subject: `Anttova — Pago acreditado de ${params.consultationName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
          <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
          <h1 style="font-size:20px;font-weight:600;color:#15803d">Pago acreditado</h1>
          <p>Hola ${patient.name || "Estimado/a"}, registramos tu ${phaseLabel}:</p>
          <div style="background:#f0fdf4;border-left:4px solid #15803d;padding:16px;margin:20px 0;border-radius:4px">
            <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
            <p style="margin:4px 0"><strong>Estado actual:</strong> ${stateLabel}</p>
          </div>
          <p style="margin:24px 0">
            <a href="${href}" style="background:#15803d;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
              Ver mi consulta
            </a>
          </p>
        </div>
      `,
      text: `Pago acreditado\nConsulta: ${params.consultationName}\nEstado actual: ${stateLabel}\nVer: ${href}`,
    });
  });
}

export async function notifyRemainderPaymentSubmitted(params: {
  patientId: string;
  patientName: string;
  consultationName: string;
  appointmentId: string;
  amount: string;
  dueAt: Date;
}) {
  await safeNotify(async () => {
    const adminIds = await getAdminUserIds();
    const paymentsUrl = "/dashboard/admin/payments";

    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "APPOINTMENT_REMINDER",
          title: "Comprobante de saldo recibido",
          body: `${params.patientName} envió el pago del saldo de ${params.consultationName} ($${params.amount}).`,
          payload: {
            deepLink: paymentsUrl,
            appointmentId: params.appointmentId,
            patientId: params.patientId,
          },
        }),
      ),
    );

    await createNotification({
      recipientId: params.patientId,
      type: "APPOINTMENT_CONFIRMED",
      title: "Saldo en revisión",
      body: `Recibimos tu comprobante de saldo por $${params.amount}. Te avisaremos cuando se confirme.`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });
  });
}

/** Avisa a admins que hoy hay cita con saldo pendiente (adelanto ya pagado). */
export async function notifyAdminRemainderDueToday(params: {
  patientId: string;
  patientName: string;
  consultationName: string;
  appointmentId: string;
  remainderAmount: string;
  startTime: Date;
}) {
  await safeNotify(async () => {
    const adminIds = await getAdminUserIds();
    const when = fmtDate(params.startTime);
    const calendarUrl = `/dashboard/admin/calendar?appointmentId=${params.appointmentId}`;
    const paymentsUrl = "/dashboard/admin/payments";

    await Promise.all(
      adminIds.map((id) =>
        createNotification({
          recipientId: id,
          type: "APPOINTMENT_REMINDER",
          title: "Saldo pendiente hoy",
          body: `${params.patientName} tiene ${params.consultationName} hoy (${when}) y aún debe el saldo de $${params.remainderAmount}.`,
          payload: {
            deepLink: paymentsUrl,
            appointmentId: params.appointmentId,
            patientId: params.patientId,
            calendarLink: calendarUrl,
          },
        }),
      ),
    );
  });
}

export async function notifyRemainderDueReminder(params: {
  patientId: string;
  consultationName: string;
  appointmentId: string;
  amount: string;
  dueAt: Date;
  daysUntilDue: number;
  patientEmail?: string | null;
  patientName?: string;
}) {
  await safeNotify(async () => {
    const dueLabel =
      params.daysUntilDue <= 0
        ? "hoy (día de tu consulta)"
        : params.daysUntilDue === 1
          ? "mañana"
          : `en ${params.daysUntilDue} días`;

    const body = `Tu saldo de $${params.amount} por ${params.consultationName} vence ${dueLabel}. Podés pagarlo desde el carrito el día de tu cita.`;

    try {
      await createNotification({
        recipientId: params.patientId,
        type: "PAYMENT_DUE_REMINDER",
        title:
          params.daysUntilDue <= 1
            ? "¡Tu saldo vence pronto!"
            : "Recordatorio de saldo pendiente",
        body,
        payload: {
          deepLink: "/dashboard/patient/cart",
          appointmentId: params.appointmentId,
        },
      });
    } catch {
      await createNotification({
        recipientId: params.patientId,
        type: "APPOINTMENT_REMINDER",
        title:
          params.daysUntilDue <= 1
            ? "¡Tu saldo vence pronto!"
            : "Recordatorio de saldo pendiente",
        body,
        payload: {
          deepLink: "/dashboard/patient/cart",
          appointmentId: params.appointmentId,
        },
      });
    }

    if (isEmailDeliveryConfigured() && params.patientEmail) {
      await sendEmail({
        to: params.patientEmail,
        subject: `Anttova — Saldo pendiente de tu cita (${params.consultationName})`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
            <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
            <h1 style="font-size:20px;font-weight:600;color:#5a1728">Saldo pendiente de tu cita</h1>
            <p>Hola ${params.patientName || "Estimado/a"},</p>
            <p>${body}</p>
            <div style="background:#fff7ed;border-left:4px solid #ea580c;padding:16px;margin:20px 0;border-radius:4px">
              <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
              <p style="margin:4px 0"><strong>Saldo:</strong> $${params.amount}</p>
              <p style="margin:4px 0"><strong>Fecha límite:</strong> ${fmtDate(params.dueAt)}</p>
            </div>
            <p style="margin:24px 0">
              <a href="${absoluteUrl("/dashboard/patient/appointments")}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                Pagar saldo ahora
              </a>
            </p>
          </div>
        `,
        text: `${body}\nPagar: ${absoluteUrl("/dashboard/patient/appointments")}`,
      });
    }
  });
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
      body: `Mañana tienes ${params.consultationName} a las ${formatClinicTime(params.startTime)}.`,
      payload: {
        deepLink: "/dashboard/patient/appointments",
        appointmentId: params.appointmentId,
      },
    });

    if (isEmailDeliveryConfigured() && params.patientEmail) {
      const when = fmtDate(params.startTime);
      await sendEmail({
        to: params.patientEmail,
        subject: `Anttova — Recordatorio de tu turno mañana: ${params.consultationName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
            <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
            <h1 style="font-size:20px;font-weight:600;color:#5a1728">Recordatorio de tu turno</h1>
            <p>Hola ${params.patientName || "Estimado/a"}, te recordamos tu consulta de mañana:</p>
            <div style="background:#f9f5f6;border-left:4px solid #5a1728;padding:16px;margin:20px 0;border-radius:4px">
              <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
              <p style="margin:4px 0"><strong>Fecha y Hora:</strong> ${when}</p>
              <p style="margin:4px 0"><strong>Profesional:</strong> Lic. Ma Antonieta Lanza</p>
            </div>
            <p style="margin:24px 0">
              <a href="${absoluteUrl("/dashboard/patient/appointments")}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                Ver mi cita
              </a>
            </p>
          </div>
        `,
        text: `Recordatorio de cita: mañana tienes ${params.consultationName} a las ${when}. Ver: ${absoluteUrl("/dashboard/patient/appointments")}`,
      });
    }
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
              deepLink: `/dashboard/admin/calendar?appointmentId=${params.appointmentId}`,
              appointmentId: params.appointmentId,
              patientId: params.patientId,
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

    if (isEmailDeliveryConfigured()) {
      let patientEmail = params.patientEmail;
      if (!patientEmail) {
        const u = await prisma.user.findUnique({
          where: { id: params.patientId },
          select: { email: true },
        });
        patientEmail = u?.email;
      }

      if (patientEmail) {
        await sendEmail({
          to: patientEmail,
          subject: `Anttova — Cita reagendada: ${params.consultationName}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
              <p style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#888">Anttova Nutrición</p>
              <h1 style="font-size:20px;font-weight:600;color:#5a1728">Tu cita fue reagendada</h1>
              <p>Hola ${params.patientName}, tu turno de consulta tiene un nuevo horario:</p>
              <div style="background:#f9f5f6;border-left:4px solid #5a1728;padding:16px;margin:20px 0;border-radius:4px">
                <p style="margin:4px 0"><strong>Consulta:</strong> ${params.consultationName}</p>
                <p style="margin:4px 0"><strong>Nuevo Horario:</strong> ${when}</p>
                <p style="margin:4px 0"><strong>Profesional:</strong> Lic. Ma Antonieta Lanza</p>
              </div>
              <p style="margin:24px 0">
                <a href="${absoluteUrl("/dashboard/patient/appointments")}" style="background:#5a1728;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">
                  Ver mi cita
                </a>
              </p>
            </div>
          `,
          text: `Tu cita fue reagendada\nConsulta: ${params.consultationName}\nNuevo Horario: ${when}\nVer: ${absoluteUrl("/dashboard/patient/appointments")}`,
        });
      }
    }
  });
}
