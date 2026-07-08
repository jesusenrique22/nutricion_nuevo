/**
 * Opciones compartidas para Prisma + adaptador Neon WebSocket (Node.js).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { getDatabaseUrl, isNeonDatabaseUrl } from "@/lib/database-url";

const require = createRequire(path.join(process.cwd(), "package.json"));

export type PrismaLogLevel = "query" | "info" | "warn" | "error";

export function createNeonPrismaClientOptions(log: PrismaLogLevel[] = ["error"]) {
  const url = getDatabaseUrl();

  if (url && isNeonDatabaseUrl(url)) {
    const { neonConfig } = require("@neondatabase/serverless") as {
      neonConfig: { webSocketConstructor?: unknown };
    };
    const { PrismaNeon } = require("@prisma/adapter-neon") as {
      PrismaNeon: new (config: { connectionString: string }) => unknown;
    };
    const ws = require("ws") as unknown;
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: url });
    return { adapter: adapter as never, log };
  }

  return {
    datasources: url ? { db: { url } } : undefined,
    log,
  };
}
