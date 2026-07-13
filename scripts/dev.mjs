#!/usr/bin/env node
/**
 * Dev server en puerto fijo 3000.
 * NextAuth (NEXTAUTH_URL) y el socket (3001) dependen de que la app NO cambie de puerto.
 */
import { statSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";

const APP_PORT = Number(process.env.PORT ?? 3000);

function portListeners(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: "utf8",
    }).trim();
    return out.length > 0 ? out.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

ensureDatabaseEnv();

/** Si cambió schema.prisma, limpiar .next para que Turbopack no use Prisma Client viejo. */
function syncDevCacheWithSchema() {
  const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
  const stampDir = path.join(process.cwd(), ".next");
  const stampPath = path.join(stampDir, "dev-schema.stamp");

  let mtime = 0;
  try {
    mtime = statSync(schemaPath).mtimeMs;
  } catch {
    return;
  }

  const prev = existsSync(stampPath)
    ? Number(readFileSync(stampPath, "utf8"))
    : 0;

  if (prev && prev !== mtime) {
    console.log("→ Schema Prisma cambió — limpiando caché de Next (.next)…");
    rmSync(stampDir, { recursive: true, force: true });
  }

  mkdirSync(stampDir, { recursive: true });
  writeFileSync(stampPath, String(mtime));
}

syncDevCacheWithSchema();

console.log("→ Generando Prisma Client…");
try {
  execSync("node scripts/prisma-cli.mjs generate", { stdio: "inherit" });
} catch {
  console.warn("⚠ No se pudo generar Prisma Client. Ejecutá: pnpm db:generate\n");
}

if (process.env.DATABASE_URL?.includes("neon.tech")) {
  try {
    const { createPrismaClient } = await import("./create-prisma-client.mjs");
    const probe = createPrismaClient();
    await probe.$queryRaw`SELECT 1`;
    await probe.$disconnect();
    console.log("✓ Neon conectado (WebSocket)\n");
  } catch {
    console.warn(
      "⚠ Neon no responde — revisá DATABASE_URL o ejecutá: pnpm run db:check\n",
    );
  }
}

const authUrl = process.env.NEXTAUTH_URL?.trim() ?? "";
const expectedOrigin = `http://localhost:${APP_PORT}`;

if (authUrl && authUrl !== expectedOrigin && authUrl.includes("localhost")) {
  console.warn(`
⚠️  NEXTAUTH_URL="${authUrl}" no coincide con el puerto ${APP_PORT}.
   En .env usá:
   AUTH_URL="${expectedOrigin}"
   NEXTAUTH_URL="${expectedOrigin}"
   (El socket sigue en NEXT_PUBLIC_SOCKET_URL=http://localhost:3001)
`);
}

const blocked = portListeners(APP_PORT);
if (blocked.length > 0) {
  console.error(`
✗ El puerto ${APP_PORT} está ocupado (PID: ${blocked.join(", ")}).
  Eso hace que Next salte a 3001 y rompe login/sesión.

  Liberá el puerto y volvé a iniciar:
    pnpm run dev:kill
    pnpm run dev

  O manualmente:
    kill ${blocked.join(" ")}
    pnpm run dev
`);
  process.exit(1);
}

console.log(`→ Next.js en http://localhost:${APP_PORT}\n`);

const child = spawn(
  "pnpm",
  ["exec", "next", "dev", "-p", String(APP_PORT)],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code) => process.exit(code ?? 0));
