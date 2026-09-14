import { NextResponse } from "next/server";
import { refreshExchangeRate } from "@/server/services/exchange-rate.service";
import { sendAppointmentReminders } from "@/server/services/reminder.service";


function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function assertCronAuth(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ job: string }> },
) {
  const denied = assertCronAuth(request);
  if (denied) return denied;

  const { job } = await params;

  if (job === "reminders") {
    const result = await sendAppointmentReminders();
    return NextResponse.json({ ok: true, ...result });
  }

  if (job === "exchange-rate") {
    try {
      const snapshot = await refreshExchangeRate();
      return NextResponse.json({
        ok: true,
        marketArsPerUsd: snapshot.marketArsPerUsd,
        fetchedAt: snapshot.fetchedAt,
        source: snapshot.source,
      });
    } catch (err) {
      console.error("[cron/exchange-rate]", err);
      return NextResponse.json(
        { ok: false, error: "No se pudo actualizar la tasa." },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}
