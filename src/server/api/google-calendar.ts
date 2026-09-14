import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { ensureDefaultCalendarAdmin } from "@/lib/calendar-admin-resolve";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar/config";
import {
  appOriginFromRequest,
  oauthRedirectUriFromRequest,
} from "@/lib/google-calendar/redirect-uri";
import {
  disconnectGoogleCalendar,
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  getGoogleCalendarAuthUrl,
  saveGoogleCalendarConnection,
} from "@/server/services/google-calendar-oauth";


const STATE_COOKIE = "gcal_oauth_state";
const REDIRECT_COOKIE = "gcal_oauth_redirect";

type RouteContext = { params: Promise<{ action: string }> };

async function handleConnect(request: Request) {
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

async function handleCallback(request: Request) {
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

  const redirectUri = savedRedirect ?? oauthRedirectUriFromRequest(request);

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${calendarUrl}?gcal=no_refresh`);
    }

    let connectedEmail: string | null = null;
    if (tokens.access_token) {
      try {
        connectedEmail = await fetchGoogleAccountEmail(tokens.access_token);
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

    return NextResponse.redirect(`${calendarUrl}?gcal=connected&sync=1`);
  } catch (err) {
    console.error("[google-calendar/callback]", err);
    return NextResponse.redirect(`${calendarUrl}?gcal=error`);
  }
}

async function handleDisconnect() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  await disconnectGoogleCalendar(session.user.id);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request, context: RouteContext) {
  const { action } = await context.params;
  if (action === "connect") return handleConnect(request);
  if (action === "callback") return handleCallback(request);
  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}

export async function POST(_request: Request, context: RouteContext) {
  const { action } = await context.params;
  if (action === "disconnect") return handleDisconnect();
  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}
