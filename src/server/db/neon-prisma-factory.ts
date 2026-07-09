/**
 * Opciones compartidas para Prisma + adaptador Neon WebSocket (Node.js).
 * Imports estáticos para que Next/Vercel incluyan los paquetes en el bundle serverless.
 */
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import WebSocket from "ws";
import { getDatabaseUrl, isNeonDatabaseUrl } from "@/lib/database-url";

export type PrismaLogLevel = "query" | "info" | "warn" | "error";

export function createNeonPrismaClientOptions(log: PrismaLogLevel[] = ["error"]) {
  const url = getDatabaseUrl();

  if (url && isNeonDatabaseUrl(url)) {
    neonConfig.webSocketConstructor = WebSocket;
    const adapter = new PrismaNeon({ connectionString: url });
    return { adapter: adapter as never, log };
  }

  return {
    datasources: url ? { db: { url } } : undefined,
    log,
  };
}
