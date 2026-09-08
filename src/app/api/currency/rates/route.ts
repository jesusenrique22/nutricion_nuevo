import { NextResponse } from "next/server";
import { getExchangeRateSnapshot } from "@/server/services/exchange-rate.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getExchangeRateSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo obtener la cotización. Intentá de nuevo más tarde." },
      { status: 503 },
    );
  }
}
