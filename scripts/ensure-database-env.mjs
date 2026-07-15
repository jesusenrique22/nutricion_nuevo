#!/usr/bin/env node
/**
 * Normaliza DATABASE_URL para Neon y deriva DIRECT_DATABASE_URL si falta.
 * Usado por dev, build y comandos Prisma CLI.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return null;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

/**
 * Carga .env y luego .env.local (override), estilo Next.js.
 * @param {{ override?: boolean }} [opts] — si true, .env.local pisa process.env
 */
export function loadEnvFile(opts = {}) {
  const files = [".env", ".env.local"];
  for (const name of files) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    const isLocal = name === ".env.local";
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const { key, val } = parsed;
      if (isLocal || opts.override) {
        process.env[key] = val;
        continue;
      }
      if (process.env[key] !== undefined) continue;
      process.env[key] = val;
    }
  }
}

function isNeonUrl(url) {
  return url.includes("neon.tech");
}

/** Añade parámetros recomendados para Neon (sin pgbouncer=true en PgBouncer 1.21+). */
export function normalizeDatabaseUrl(raw) {
  const input = raw?.trim();
  if (!input) return input;

  try {
    const url = new URL(input);
    if (!isNeonUrl(url.hostname)) return input;

    // Incompatible con @neondatabase/serverless (WebSocket) en Vercel/serverless.
    url.searchParams.delete("channel_binding");

    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    if (process.env.NODE_ENV !== "production") {
      // Debe coincidir con src/lib/database-url.ts (dev.mjs corre esto antes que Next).
      url.searchParams.set("connection_limit", "15");
      url.searchParams.set("pool_timeout", "45");
    }

    return url.toString();
  } catch {
    return input;
  }
}

/** URL directa (sin -pooler) para migraciones y Prisma CLI. */
export function deriveNeonDirectUrl(pooledUrl) {
  if (!pooledUrl?.includes("-pooler")) return undefined;

  try {
    const url = new URL(pooledUrl);
    url.hostname = url.hostname.replace("-pooler", "");
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    return pooledUrl
      .replace("-pooler", "")
      .replace(/[?&]pgbouncer=true/g, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

export function ensureDatabaseEnv() {
  loadEnvFile();

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return;

  if (!process.env.DIRECT_DATABASE_URL?.trim()) {
    const direct = deriveNeonDirectUrl(raw);
    process.env.DIRECT_DATABASE_URL = direct ?? raw;
  }

  process.env.DATABASE_URL = normalizeDatabaseUrl(raw);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  ensureDatabaseEnv();
}
