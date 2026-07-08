#!/usr/bin/env node
/**
 * Build de producción: generate → migrate deploy (opcional) → next build.
 */
import { execSync } from "node:child_process";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function printNeonHelp() {
  console.error(`
✗ No se pudo conectar a PostgreSQL (Neon).

Pasos en console.neon.tech:
  1. Abre tu proyecto → debe estar "Active" (no suspendido).
  2. Dashboard → Connection details → copia la URL **Pooled** nueva.
  3. Pégala en .env y en Vercel como DATABASE_URL (con ?sslmode=require).
  4. Si sigue fallando: "Reset password" en Neon y vuelve a copiar la URL.

Para compilar SIN migrar (mientras arreglas Neon):
  SKIP_MIGRATE=1 pnpm run build

O solo Next.js:
  pnpm run build:local
`);
}

async function migrateDeployWithRetry() {
  if (process.env.SKIP_MIGRATE === "1") {
    console.warn("[build] SKIP_MIGRATE=1 — omitiendo prisma migrate deploy");
    return;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("\n✗ Falta DATABASE_URL en .env o Vercel.\n");
    process.exit(1);
  }

  const attempts = 3;
  const delayMs = 6000;

  for (let i = 1; i <= attempts; i++) {
    try {
      run("node scripts/prisma-cli.mjs migrate deploy");
      return;
    } catch {
      if (i < attempts) {
        console.warn(
          `[migrate] Intento ${i}/${attempts} falló. Reintentando en ${delayMs / 1000}s…`,
        );
        await sleep(delayMs);
      }
    }
  }

  console.warn(
    "[migrate] TCP a Neon falló (P1001). Usando fallback WebSocket…",
  );
  try {
    run("node scripts/migrate-deploy-ws.mjs");
    return;
  } catch {
    printNeonHelp();
    process.exit(1);
  }
}

async function main() {
  ensureDatabaseEnv();
  run("node scripts/check-edge-boundaries.mjs");
  run("pnpm exec tsx scripts/check-production-env.ts");
  run("node scripts/prisma-cli.mjs generate");
  await migrateDeployWithRetry();
  run("node scripts/check-db-schema.mjs");
  run("pnpm exec next build");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
