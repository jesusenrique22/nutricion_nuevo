import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar/config";
import { getGoogleCalendarAuthUrl } from "@/server/services/google-calendar.service";

const STATE_COOKIE = "gcal_oauth_state";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(
      new URL("/login?error=unauthorized", process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    );
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/admin/calendar?gcal=missing_config",
        process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      ),
    );
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const url = getGoogleCalendarAuthUrl(state);
  return NextResponse.redirect(url);
}
