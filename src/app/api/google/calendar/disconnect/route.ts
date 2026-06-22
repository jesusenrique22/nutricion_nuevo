import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disconnectGoogleCalendar } from "@/server/services/google-calendar.service";

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  await disconnectGoogleCalendar(session.user.id);
  return NextResponse.json({ ok: true });
}
