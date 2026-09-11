/**
 * Recordatorios de citas y saldos pendientes (tipo Cashea).
 * Uso: pnpm run reminders
 */
import { createPrismaClient } from "./create-prisma-client.mjs";

const prisma = createPrismaClient();
const REMINDER_HOURS_AHEAD = 24;
const WINDOW_MINUTES = 30;
const MS_DAY = 86_400_000;
const CLINIC_TZ = "America/Argentina/Buenos_Aires";

function dateKeyInClinicTz(date) {
  return date.toLocaleDateString("en-CA", { timeZone: CLINIC_TZ });
}

function fmtTime(date) {
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit });
}

function daysUntil(dueAt, now) {
  return Math.ceil((dueAt.getTime() - now.getTime()) / MS_DAY);
}

async function sendAppointmentReminders(now) {
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
      data: { reminderSentAt: now },
    });

    console.log(`Recordatorio cita: ${appt.id}`);
  }

  return appointments.length;
}

async function sendRemainderDueReminders(now) {
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gt: now },
      payment: {
        advanceStatus: "PAID",
        remainderStatus: "PENDING",
        remainderAmount: { gt: 0 },
        remainderSubmittedAt: null,
      },
    },
    include: {
      consultationType: true,
      payment: true,
      patient: { select: { email: true, name: true } },
    },
  });

  let sent = 0;

  for (const appt of appointments) {
    if (!appt.payment) continue;

    const days = daysUntil(appt.startTime, now);
    const amount = appt.payment.remainderAmount.toString();
    const name = appt.consultationType.name;

    const tiers = [
      { days: 7, field: "remainderReminder7dSentAt", minDays: 6, maxDays: 8 },
      { days: 3, field: "remainderReminder3dSentAt", minDays: 2, maxDays: 4 },
      { days: 1, field: "remainderReminder1dSentAt", minDays: 0, maxDays: 2 },
    ];

    for (const tier of tiers) {
      if (appt[tier.field]) continue;
      if (days < tier.minDays || days > tier.maxDays) continue;

      const dueLabel =
        days <= 0
          ? "hoy (día de tu consulta)"
          : days === 1
            ? "mañana"
            : `en ${days} días`;

      await prisma.notification.create({
        data: {
          recipientId: appt.patientId,
          type: "APPOINTMENT_REMINDER",
          title:
            days <= 1
              ? "¡Tu saldo vence pronto!"
              : "Recordatorio de saldo pendiente",
          body: `Tu saldo de $${amount} por ${name} vence ${dueLabel}. Podés pagarlo desde el carrito el día de tu cita.`,
          payload: {
            deepLink: "/dashboard/patient/cart",
            appointmentId: appt.id,
          },
        },
      });

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { [tier.field]: now },
      });

      console.log(
        `Recordatorio saldo (${tier.days}d): ${appt.id} · faltan ${days} días`,
      );
      sent++;
      break;
    }
  }

  return sent;
}

async function sendAdminRemainderDueTodayReminders(now) {
  const todayKey = dateKeyInClinicTz(now);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      remainderAdminDueDaySentAt: null,
      payment: {
        advanceStatus: "PAID",
        remainderStatus: "PENDING",
        remainderAmount: { gt: 0 },
      },
    },
    include: {
      consultationType: true,
      payment: true,
      patient: { select: { name: true } },
    },
  });

  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (adminUsers.length === 0) return 0;

  let sent = 0;

  for (const appt of appointments) {
    if (!appt.payment) continue;
    if (dateKeyInClinicTz(appt.startTime) !== todayKey) continue;

    const amount = appt.payment.remainderAmount.toString();
    const when = appt.startTime.toLocaleString("es", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: CLINIC_TZ,
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          recipientId: admin.id,
          type: "APPOINTMENT_REMINDER",
          title: "Saldo pendiente hoy",
          body: `${appt.patient.name} tiene ${appt.consultationType.name} hoy (${when}) y aún debe el saldo de $${amount}.`,
          payload: {
            deepLink: "/dashboard/admin/payments",
            appointmentId: appt.id,
            patientId: appt.patientId,
          },
        },
      });
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { remainderAdminDueDaySentAt: now },
    });

    console.log(`Aviso admin saldo hoy: ${appt.id}`);
    sent++;
  }

  return sent;
}

async function main() {
  const now = new Date();
  const apptCount = await sendAppointmentReminders(now);
  const payCount = await sendRemainderDueReminders(now);
  const adminCount = await sendAdminRemainderDueTodayReminders(now);

  if (apptCount === 0 && payCount === 0 && adminCount === 0) {
    console.log("Sin recordatorios pendientes.");
    return;
  }

  console.log(
    `Total: ${apptCount} cita(s), ${payCount} saldo paciente, ${adminCount} aviso(s) admin.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
