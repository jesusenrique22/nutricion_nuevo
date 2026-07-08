/**
 * Ejecuta recordatorios de citas sin depender de Vercel Cron ni servicios pagos.
 * Uso: npm run reminders
 */
import { createPrismaClient } from "./create-prisma-client.mjs";

const prisma = createPrismaClient();
const REMINDER_HOURS_AHEAD = 24;
const WINDOW_MINUTES = 30;

function fmtTime(date) {
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

async function main() {
  const now = new Date();
  const target = new Date(now.getTime() + REMINDER_HOURS_AHEAD * 60 * 60 * 1000);
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

  if (appointments.length === 0) {
    console.log("Sin recordatorios pendientes.");
    return;
  }

  for (const appt of appointments) {
    await prisma.notification.create({
      data: {
        recipientId: appt.patientId,
        type: "APPOINTMENT_REMINDER",
        title: "Recordatorio de cita",
        body: `Mañana tienes ${appt.consultationType.name} a las ${fmtTime(appt.startTime)}.`,
        payload: {
          deepLink: "/dashboard/patient/appointments",
          appointmentId: appt.id,
        },
      },
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });

    console.log(`Recordatorio enviado: ${appt.id}`);
  }

  console.log(`Total: ${appointments.length} recordatorio(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
