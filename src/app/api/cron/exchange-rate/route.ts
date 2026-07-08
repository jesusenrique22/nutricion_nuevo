import { NextResponse } from "next/server";
import { refreshExchangeRate } from "@/server/services/exchange-rate.service";

/**
 * Cron diario: actualiza el dólar blue desde dolarapi.com.
 * Crons: ver rutas y horarios en deploy.json. Local: curl con CRON_SECRET.
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

  try {
    const snapshot = await refreshExchangeRate();
    return NextResponse.json({
      ok: true,
      marketArsPerUsd: snapshot.marketArsPerUsd,
      fetchedAt: snapshot.fetchedAt,
      source: snapshot.source,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "No se pudo actualizar la tasa.",
      },
      { status: 503 },
    );
  }
}
