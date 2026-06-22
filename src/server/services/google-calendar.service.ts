import { google } from "googleapis";
import type { GoogleCalendarConnection } from "@prisma/client";
import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";
import { prisma } from "@/server/db/prisma";

function createOAuthClient(redirectUri?: string) {
  const config = getGoogleCalendarConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("Google Calendar OAuth no configurado.");
  }

  return new google.auth.OAuth2(
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

async function getConnectionForUser(
  userId: string,
): Promise<GoogleCalendarConnection | null> {
  return prisma.googleCalendarConnection.findUnique({
    where: { userId },
  });
}

async function getAuthedClient(connection: GoogleCalendarConnection) {
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

export type CalendarEventInput = {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
};

export async function createGoogleCalendarEvent(
  adminUserId: string,
  input: CalendarEventInput,
): Promise<string | null> {
  const connection = await getConnectionForUser(adminUserId);
  if (!connection) return null;

  const auth = await getAuthedClient(connection);
  const calendar = google.calendar({ version: "v3", auth });
  const { timeZone } = getGoogleCalendarConfig();

  const res = await calendar.events.insert({
    calendarId: connection.calendarId,
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startTime.toISOString(), timeZone },
      end: { dateTime: input.endTime.toISOString(), timeZone },
    },
  });

  return res.data.id ?? null;
}

export async function updateGoogleCalendarEvent(
  adminUserId: string,
  eventId: string,
  input: CalendarEventInput,
): Promise<void> {
  const connection = await getConnectionForUser(adminUserId);
  if (!connection) return;

  const auth = await getAuthedClient(connection);
  const calendar = google.calendar({ version: "v3", auth });
  const { timeZone } = getGoogleCalendarConfig();

  await calendar.events.patch({
    calendarId: connection.calendarId,
    eventId,
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startTime.toISOString(), timeZone },
      end: { dateTime: input.endTime.toISOString(), timeZone },
    },
  });
}

export async function deleteGoogleCalendarEvent(
  adminUserId: string,
  eventId: string,
): Promise<void> {
  const connection = await getConnectionForUser(adminUserId);
  if (!connection) return;

  const auth = await getAuthedClient(connection);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: connection.calendarId,
      eventId,
    });
  } catch (err) {
    const status = (err as { code?: number }).code;
    if (status === 404 || status === 410) return;
    throw err;
  }
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
