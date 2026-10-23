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

  // EventEmitter no espera listeners async: en serverless el proceso se
  // congela antes de que termine el UPDATE y el token refrescado se perdía.
  // Se guarda la promesa para poder esperarla con flushGoogleTokens().
  oauth2.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    const write = prisma.googleCalendarConnection
      .update({
        where: { id: connection.id },
        data: {
          accessToken: tokens.access_token,
          tokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : connection.tokenExpiry,
          ...(tokens.refresh_token
            ? { refreshToken: tokens.refresh_token }
            : {}),
          invalidatedAt: null,
          lastError: null,
        },
      })
      .then(() => undefined)
      .catch((err) => {
        console.error("[google-calendar/token-persist]", err);
      });
    pendingTokenWrites.set(oauth2, write);
  });

  return oauth2;
}

/** Promesas de guardado de token pendientes, por cliente OAuth. */
const pendingTokenWrites = new WeakMap<OAuth2Client, Promise<void>>();

/** Espera a que se persista el token refrescado antes de cerrar la request. */
export async function flushGoogleTokens(client: OAuth2Client): Promise<void> {
  const pending = pendingTokenWrites.get(client);
  if (pending) await pending;
}

/** ¿Google dijo que el permiso ya no vale? */
export function isGoogleAuthRevokedError(err: unknown): boolean {
  const data = (err as { response?: { data?: { error?: string } } })?.response
    ?.data;
  if (data?.error === "invalid_grant") return true;
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("invalid_grant") ||
    message.includes("Token has been expired or revoked")
  );
}

/**
 * Marca la conexión como caída para que el panel lo muestre.
 *
 * Con la app OAuth en modo "Testing", Google caduca el refresh token a los 7
 * días; sin esta marca la agenda decía "conectado" y los eventos dejaban de
 * sincronizarse sin que nadie se enterara.
 */
export async function markGoogleConnectionInvalid(
  userId: string,
  reason: string,
): Promise<void> {
  try {
    await prisma.googleCalendarConnection.updateMany({
      where: { userId },
      data: { invalidatedAt: new Date(), lastError: reason.slice(0, 500) },
    });
  } catch (err) {
    console.error("[google-calendar/mark-invalid]", err);
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
    invalidatedAt: row.invalidatedAt?.toISOString() ?? null,
    lastError: row.lastError,
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
