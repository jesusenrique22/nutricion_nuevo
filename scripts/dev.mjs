#!/usr/bin/env node
/**
 * Dev server en puerto fijo 3000.
 * NextAuth (NEXTAUTH_URL) y el socket (3001) dependen de que la app NO cambie de puerto.
 */
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
