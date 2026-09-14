import { NextResponse } from "next/server";
import {
  getDashboardBadges,
  getSession,
} from "@/server/queries/cached-dashboard";

export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const badges = await getDashboardBadges();
  return NextResponse.json(badges);
}
