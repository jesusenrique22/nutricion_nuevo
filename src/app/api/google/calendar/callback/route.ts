import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";
import { ensureDefaultCalendarAdmin } from "@/lib/calendar-admin-resolve";
import {
  exchangeCodeForTokens,
  saveGoogleCalendarConnection,
} from "@/server/services/google-calendar.service";

const STATE_COOKIE = "gcal_oauth_state";

export async function GET(request: Request) {
  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const calendarUrl = `${baseUrl}/dashboard/admin/calendar`;

  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return NextResponse.redirect(`${baseUrl}/login?error=unauthorized`);
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${calendarUrl}?gcal=denied`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${calendarUrl}?gcal=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${calendarUrl}?gcal=no_refresh`);
    }

    let connectedEmail: string | null = null;
    if (tokens.access_token) {
      const config = getGoogleCalendarConfig();
      const oauth2 = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri,
      );
      oauth2.setCredentials({ access_token: tokens.access_token });
      const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
      const profile = await oauth2Api.userinfo.get();
      connectedEmail = profile.data.email ?? null;
    }

    await saveGoogleCalendarConnection({
      userId: session.user.id,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      connectedEmail,
    });

    await ensureDefaultCalendarAdmin(session.user.id);

    return NextResponse.redirect(`${calendarUrl}?gcal=connected`);
  } catch (err) {
    console.error("[google-calendar/callback]", err);
    return NextResponse.redirect(`${calendarUrl}?gcal=error`);
  }
}
