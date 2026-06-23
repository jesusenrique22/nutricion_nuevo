import { absoluteUrl, isEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { appointmentReminderEmail } from "@/lib/email-messages";
import { prisma } from "@/server/db/prisma";
import { notifyAppointmentReminder } from "@/server/services/appointment-notify.service";

const REMINDER_HOURS_AHEAD = 24;
const WINDOW_MINUTES = 30;

export interface ReminderRunResult {
  sent: number;
  skipped: number;
}

/**
 * Envía recordatorios in-app (y por correo si SMTP está configurado) para citas
 * que empiezan en ~24 h. Diseñado para cron horario o `npm run reminders`.
 */
export async function sendAppointmentReminders(): Promise<ReminderRunResult> {
  const now = new Date();
  const target = new Date(
    now.getTime() + REMINDER_HOURS_AHEAD * 60 * 60 * 1000,
  );
  const windowMs = WINDOW_MINUTES * 60 * 1000;

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      reminderSentAt: null,
      startTime: {
        gte: new Date(target.getTime() - windowMs),
        lte: new Date(target.getTime() + windowMs),
      },
    },
    include: { consultationType: true, patient: true },
  });

  let sent = 0;
  const appointmentsUrl = absoluteUrl("/dashboard/patient/appointments");

  for (const appt of appointments) {
    await notifyAppointmentReminder({
      patientId: appt.patientId,
      consultationName: appt.consultationType.name,
      startTime: appt.startTime,
      appointmentId: appt.id,
      patientEmail: appt.patient.email,
      patientName: appt.patient.name,
    });

    if (
      appt.patient.email &&
      isEmailDeliveryConfigured()
    ) {
      const msg = appointmentReminderEmail({
        name: appt.patient.name,
        consultationName: appt.consultationType.name,
        startTime: appt.startTime,
        appointmentsUrl,
      });
      await sendEmail({
        to: appt.patient.email,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });
    sent++;
  }

  return { sent, skipped: appointments.length - sent };
}
