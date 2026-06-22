const CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

export function getGoogleCalendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ??
    `${(process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/google/calendar/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    timeZone:
      process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() ??
      "America/Argentina/Buenos_Aires",
    scopes: [CALENDAR_EVENTS_SCOPE],
  };
}

export function isGoogleCalendarConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleCalendarConfig();
  return Boolean(clientId && clientSecret);
}
