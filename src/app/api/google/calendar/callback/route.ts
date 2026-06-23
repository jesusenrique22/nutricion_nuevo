import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { ensureDefaultCalendarAdmin } from "@/lib/calendar-admin-resolve";
import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";
import {
  appOriginFromRequest,
  oauthRedirectUriFromRequest,
} from "@/lib/google-calendar/redirect-uri";
import {
  exchangeCodeForTokens,
  saveGoogleCalendarConnection,
} from "@/server/services/google-calendar.service";
import { syncUnsyncedAppointmentsForAdmin } from "@/server/services/google-calendar-sync.service";

const STATE_COOKIE = "gcal_oauth_state";
const REDIRECT_COOKIE = "gcal_oauth_redirect";

export async function GET(request: Request) {
  const baseUrl = appOriginFromRequest(request);
  const calendarUrl = `${baseUrl}/dashboard/admin/calendar`;

  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return NextResponse.redirect(`${baseUrl}/login?error=unauthorized`);
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    const detail = searchParams.get("error_description");
    const params = new URLSearchParams({ gcal: "denied" });
    if (detail) params.set("gcal_detail", detail.slice(0, 200));
    return NextResponse.redirect(`${calendarUrl}?${params.toString()}`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  const savedRedirect = cookieStore.get(REDIRECT_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(REDIRECT_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${calendarUrl}?gcal=invalid_state`);
  }

  const redirectUri =
    savedRedirect ?? oauthRedirectUriFromRequest(request);

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${calendarUrl}?gcal=no_refresh`);
    }

    let connectedEmail: string | null = null;
    if (tokens.access_token) {
      try {
        const config = getGoogleCalendarConfig();
        const oauth2 = new google.auth.OAuth2(
          config.clientId,
          config.clientSecret,
          redirectUri,
        );
        oauth2.setCredentials({ access_token: tokens.access_token });
        const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
        const profile = await oauth2Api.userinfo.get();
        connectedEmail = profile.data.email ?? null;
      } catch (profileErr) {
        console.warn("[google-calendar/callback] userinfo omitido:", profileErr);
      }
    }

    await saveGoogleCalendarConnection({
      userId: session.user.id,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      connectedEmail,
    });

    try {
      await ensureDefaultCalendarAdmin(session.user.id);
    } catch (defaultErr) {
      console.warn("[google-calendar/callback] default admin:", defaultErr);
    }

    try {
      const result = await syncUnsyncedAppointmentsForAdmin(session.user.id);
      console.info("[google-calendar/callback] backfill", result);
    } catch (backfillErr) {
      console.warn("[google-calendar/callback] backfill:", backfillErr);
    }

    return NextResponse.redirect(`${calendarUrl}?gcal=connected`);
  } catch (err) {
    console.error("[google-calendar/callback]", err);
    const params = new URLSearchParams({ gcal: "error" });
    const message =
      err instanceof Error ? err.message : "Error desconocido al guardar la conexión.";
    params.set("gcal_detail", message.slice(0, 240));
    return NextResponse.redirect(`${calendarUrl}?${params.toString()}`);
  }
}
