import { prisma } from "@/server/db/prisma";
import { notifyAppointmentReminder } from "@/server/services/appointment-notify.service";

const REMINDER_HOURS_AHEAD = 24;
const WINDOW_MINUTES = 30;

export interface ReminderRunResult {
  sent: number;
  skipped: number;
}

/**
 * Envía recordatorios in-app para citas que empiezan en ~24 h.
 * Diseñado para ejecutarse cada hora vía cron del sistema o `npm run reminders`.
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
    include: { consultationType: true },
  });

  let sent = 0;
  for (const appt of appointments) {
    await notifyAppointmentReminder({
      patientId: appt.patientId,
      consultationName: appt.consultationType.name,
      startTime: appt.startTime,
      appointmentId: appt.id,
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });
    sent++;
  }

  return { sent, skipped: appointments.length - sent };
}
