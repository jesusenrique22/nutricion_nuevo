#!/usr/bin/env node
/**
 * Factory compartida: Prisma Client con adaptador Neon WebSocket cuando DATABASE_URL es Neon.
 * Usar en scripts (check-db, reminders, seed vía tsx, etc.) en lugar de `new PrismaClient()`.
 */
import { createRequire } from "node:module";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";

const require = createRequire(import.meta.url);

export function isNeonDatabaseUrl(url) {
  return url.includes("neon.tech");
}

/**
 * @param {{ log?: ("query"|"info"|"warn"|"error")[] }} [options]
 */
export function createPrismaClient(options = {}) {
  ensureDatabaseEnv();

  const { PrismaClient } = require("@prisma/client");
  const url = process.env.DATABASE_URL?.trim() ?? "";
  const log = options.log ?? ["error"];

  if (url && isNeonDatabaseUrl(url)) {
    const { neonConfig } = require("@neondatabase/serverless");
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: url });
    return new PrismaClient({ adapter, log });
  }

  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log,
  });
}
