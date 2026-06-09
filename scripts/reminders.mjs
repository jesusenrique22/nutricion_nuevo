/**
 * Ejecuta recordatorios de citas sin depender de Vercel Cron ni servicios pagos.
 * Uso: npm run reminders
 */
import { PrismaClient } from "@prisma/client";
import { MongoClient } from "mongodb";

const prisma = new PrismaClient();
const REMINDER_HOURS_AHEAD = 24;
const WINDOW_MINUTES = 30;

function fmtTime(date) {
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const mongoDbName = process.env.MONGODB_DB ?? "nutricion_chat";
  let mongo = null;

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

  if (mongoUri) {
    mongo = new MongoClient(mongoUri);
    await mongo.connect();
    const db = mongo.db(mongoDbName);
    const col = db.collection("notifications");

    for (const appt of appointments) {
      await col.insertOne({
        recipientId: appt.patientId,
        type: "APPOINTMENT_REMINDER",
        title: "Recordatorio de cita",
        body: `Mañana tienes ${appt.consultationType.name} a las ${fmtTime(appt.startTime)}.`,
        payload: {
          deepLink: "/dashboard/patient/appointments",
          appointmentId: appt.id,
        },
        isRead: false,
        createdAt: new Date(),
      });

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });

      console.log(`Recordatorio enviado: ${appt.id}`);
    }
  } else {
    console.warn("MONGODB_URI no configurado — solo marcaría citas sin notificar.");
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
