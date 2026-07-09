import { OAuth2Client } from "google-auth-library";
import type { GoogleCalendarConnection } from "@prisma/client";
import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";
import { prisma } from "@/server/db/prisma";

function createOAuthClient(redirectUri?: string): OAuth2Client {
  const config = getGoogleCalendarConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Google Calendar OAuth no configurado.");
  }

  return new OAuth2Client(
    config.clientId,
    config.clientSecret,
    redirectUri ?? config.redirectUri,
  );
}

export function getGoogleCalendarAuthUrl(
  state: string,
  redirectUri?: string,
): string {
  const oauth2 = createOAuthClient(redirectUri);
  const { scopes } = getGoogleCalendarConfig();

  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
  });
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string,
) {
  const oauth2 = createOAuthClient(redirectUri);
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export async function getConnectionForUser(
  userId: string,
): Promise<GoogleCalendarConnection | null> {
  return prisma.googleCalendarConnection.findUnique({
    where: { userId },
  });
}

export async function getAuthedOAuthClient(
  connection: GoogleCalendarConnection,
): Promise<OAuth2Client> {
  const oauth2 = createOAuthClient();
  oauth2.setCredentials({
    refresh_token: connection.refreshToken,
    access_token: connection.accessToken ?? undefined,
    expiry_date: connection.tokenExpiry?.getTime(),
  });

  oauth2.on("tokens", async (tokens) => {
    if (!tokens.access_token) return;
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: tokens.access_token,
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : connection.tokenExpiry,
        ...(tokens.refresh_token
          ? { refreshToken: tokens.refresh_token }
          : {}),
      },
    });
  });

  return oauth2;
}

export async function saveGoogleCalendarConnection(params: {
  userId: string;
  refreshToken: string;
  accessToken?: string | null;
  tokenExpiry?: Date | null;
  connectedEmail?: string | null;
}) {
  if (!params.refreshToken) {
    throw new Error("Google no devolvió refresh_token. Reintenta con prompt=consent.");
  }

  await prisma.googleCalendarConnection.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      refreshToken: params.refreshToken,
      accessToken: params.accessToken ?? null,
      tokenExpiry: params.tokenExpiry ?? null,
      connectedEmail: params.connectedEmail ?? null,
    },
    update: {
      refreshToken: params.refreshToken,
      accessToken: params.accessToken ?? null,
      tokenExpiry: params.tokenExpiry ?? null,
      connectedEmail: params.connectedEmail ?? null,
    },
  });
}

export async function disconnectGoogleCalendar(userId: string) {
  await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
}

export async function getGoogleCalendarConnectionSummary(userId: string) {
  const row = await getConnectionForUser(userId);
  if (!row) return null;
  return {
    connectedEmail: row.connectedEmail,
    calendarId: row.calendarId,
    connectedAt: row.updatedAt.toISOString(),
  };
}

export async function getCalendarAdminStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDefaultCalendarAdmin: true },
  });
  return {
    isDefaultCalendarAdmin: user?.isDefaultCalendarAdmin ?? false,
  };
}

export async function fetchGoogleAccountEmail(
  accessToken: string,
): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}
