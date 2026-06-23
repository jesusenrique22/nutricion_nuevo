import { headers } from "next/headers";

/** IP del cliente (Vercel / proxy). Fallback seguro si no hay header. */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-real-ip")?.trim() ||
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown-ip"
  );
}
