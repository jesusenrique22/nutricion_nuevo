import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar/config";
import { oauthRedirectUriFromRequest } from "@/lib/google-calendar/redirect-uri";
import { getGoogleCalendarAuthUrl } from "@/server/services/google-calendar.service";

const STATE_COOKIE = "gcal_oauth_state";
const REDIRECT_COOKIE = "gcal_oauth_redirect";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin.replace(/\/$/, "");
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login?error=unauthorized", origin));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard/admin/calendar?gcal=missing_config", origin),
    );
  }

  const redirectUri = oauthRedirectUriFromRequest(request);
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  cookieStore.set(STATE_COOKIE, state, cookieOptions);
  cookieStore.set(REDIRECT_COOKIE, redirectUri, cookieOptions);

  const url = getGoogleCalendarAuthUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
