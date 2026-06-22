/** URI de callback OAuth según el host desde el que se inició la conexión. */
export function oauthRedirectUriFromRequest(request: Request): string {
  const origin = new URL(request.url).origin.replace(/\/$/, "");
  return `${origin}/api/google/calendar/callback`;
}

export function appOriginFromRequest(request: Request): string {
  return new URL(request.url).origin.replace(/\/$/, "");
}
