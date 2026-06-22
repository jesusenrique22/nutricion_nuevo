const CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";
const USERINFO_EMAIL_SCOPE =
  "https://www.googleapis.com/auth/userinfo.email";

/** Evita URIs corruptas si en Vercel se pegaron varias variables en un solo campo. */
function sanitizeEnvUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const firstLine = raw.split(/[\r\n]/)[0]?.trim();
  if (!firstLine) return undefined;
  const match = firstLine.match(/^https?:\/\/[^\s]+/);
  return match?.[0];
}

export function getGoogleCalendarConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const nextAuthBase = (
    sanitizeEnvUrl(process.env.NEXTAUTH_URL) ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const redirectUri =
    sanitizeEnvUrl(process.env.GOOGLE_CALENDAR_REDIRECT_URI) ??
    `${nextAuthBase}/api/google/calendar/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    timeZone:
      process.env.GOOGLE_CALENDAR_TIMEZONE?.trim() ??
      "America/Argentina/Buenos_Aires",
    scopes: [CALENDAR_EVENTS_SCOPE, USERINFO_EMAIL_SCOPE],
  };
}

export function isGoogleCalendarConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleCalendarConfig();
  return Boolean(clientId && clientSecret);
}
