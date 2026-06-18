#!/usr/bin/env node
/**
 * Build de producción: generate → migrate deploy (opcional) → next build.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

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
      run("pnpm exec prisma migrate deploy");
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

  printNeonHelp();
  process.exit(1);
}

async function main() {
  loadEnvFile();
  run("node scripts/check-edge-boundaries.mjs");
  run("pnpm exec prisma generate");
  await migrateDeployWithRetry();
  run("pnpm exec next build");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
