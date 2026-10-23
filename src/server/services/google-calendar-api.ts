import { google } from "googleapis";
import { getGoogleCalendarConfig } from "@/lib/google-calendar/config";
import {
  flushGoogleTokens,
  getAuthedOAuthClient,
  getConnectionForUser,
  isGoogleAuthRevokedError,
  markGoogleConnectionInvalid,
} from "@/server/services/google-calendar-oauth";

/**
 * Centraliza el manejo de errores de Google: si revocó el permiso, deja la
 * conexión marcada como caída para que el panel pida reconectar, y espera a
 * que se persista cualquier token refrescado antes de volver.
 */
async function runCalendarCall<T>(
  adminUserId: string,
  client: Parameters<typeof flushGoogleTokens>[0],
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const result = await fn();
    await flushGoogleTokens(client);
    return result;
  } catch (err) {
    if (isGoogleAuthRevokedError(err)) {
      await markGoogleConnectionInvalid(
        adminUserId,
        "Google revocó el acceso. Volvé a conectar tu calendario.",
      );
    }
    throw err;
  }
}

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

  const res = await runCalendarCall(adminUserId, auth, () =>
    calendar.events.insert({
      calendarId: connection.calendarId,
      sendUpdates: "all",
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startTime.toISOString(), timeZone },
        end: { dateTime: input.endTime.toISOString(), timeZone },
        ...(input.attendees?.length ? { attendees: input.attendees } : {}),
      },
    }),
  );

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

  await runCalendarCall(adminUserId, auth, () =>
    calendar.events.patch({
      calendarId: connection.calendarId,
      eventId,
      sendUpdates: "all",
      requestBody: {
        // Si el evento se borró a mano en Google queda "cancelled": lo restaura.
        status: "confirmed",
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startTime.toISOString(), timeZone },
        end: { dateTime: input.endTime.toISOString(), timeZone },
        ...(input.attendees?.length ? { attendees: input.attendees } : {}),
      },
    }),
  );
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
    await runCalendarCall(adminUserId, auth, () =>
      calendar.events.delete({
        calendarId: connection.calendarId,
        eventId,
      }),
    );
  } catch (err) {
    const status = (err as { code?: number }).code;
    if (status === 404 || status === 410) return;
    throw err;
  }
}
