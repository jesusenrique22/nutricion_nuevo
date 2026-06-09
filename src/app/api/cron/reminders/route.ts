import { NextResponse } from "next/server";
import { sendAppointmentReminders } from "@/server/services/reminder.service";

/**
 * Endpoint para cron del sistema (sin servicios de terceros).
 * Ejemplo crontab: 0 * * * * curl -s -H "Authorization: Bearer TU_CRON_SECRET" http://localhost:3000/api/cron/reminders
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await sendAppointmentReminders();
  return NextResponse.json({ ok: true, ...result });
}
