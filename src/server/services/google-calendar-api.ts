import { google } from "googleapis";
import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";
import {
  getAuthedOAuthClient,
  getConnectionForUser,
} from "@/server/services/google-calendar-oauth";

export type CalendarEventInput = {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees?: Array<{ email: string; displayName?: string }>;
  isOnline?: boolean;
};

export async function createGoogleCalendarEvent(
  adminUserId: string,
  input: CalendarEventInput,
): Promise<string | null> {
  const connection = await getConnectionForUser(adminUserId);
  if (!connection) return null;

  const auth = await getAuthedOAuthClient(connection);
  const calendar = google.calendar({
    version: "v3",
    auth: auth as Parameters<typeof google.calendar>[0]["auth"],
  });
  const { timeZone } = getGoogleCalendarConfig();

  const baseBody = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startTime.toISOString(), timeZone },
    end: { dateTime: input.endTime.toISOString(), timeZone },
    ...(input.attendees?.length ? { attendees: input.attendees } : {}),
  };

  if (input.isOnline) {
    try {
      const res = await calendar.events.insert({
        calendarId: connection.calendarId,
        sendUpdates: "all",
        conferenceDataVersion: 1,
        requestBody: {
          ...baseBody,
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },
        },
      });
      return res.data.id ?? null;
    } catch (confErr) {
      console.warn("[google-calendar/api] Fallback sin conferenceData:", confErr);
    }
  }

  const res = await calendar.events.insert({
    calendarId: connection.calendarId,
    sendUpdates: "all",
    requestBody: baseBody,
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

  const auth = await getAuthedOAuthClient(connection);
  const calendar = google.calendar({
    version: "v3",
    auth: auth as Parameters<typeof google.calendar>[0]["auth"],
  });
  const { timeZone } = getGoogleCalendarConfig();

  await calendar.events.patch({
    calendarId: connection.calendarId,
    eventId,
    sendUpdates: "all",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startTime.toISOString(), timeZone },
      end: { dateTime: input.endTime.toISOString(), timeZone },
      ...(input.attendees?.length ? { attendees: input.attendees } : {}),
    },
  });
}

export async function deleteGoogleCalendarEvent(
  adminUserId: string,
  eventId: string,
): Promise<void> {
  const connection = await getConnectionForUser(adminUserId);
  if (!connection) return;

  const auth = await getAuthedOAuthClient(connection);
  const calendar = google.calendar({
    version: "v3",
    auth: auth as Parameters<typeof google.calendar>[0]["auth"],
  });

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
