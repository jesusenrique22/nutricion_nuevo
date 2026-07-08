#!/usr/bin/env node
/**
 * Chequeo completo antes de subir a producción:
 * 1. Límites Edge (proxy sin Prisma)
 * 2. Build de producción (pnpm run build)
 * 3. Smoke test con next start (/login, etc.)
 */
import { execSync } from "node:child_process";

function run(cmd, env = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

async function main() {
  console.log("═══ Check deploy (local ≈ producción) ═══\n");

  run("node scripts/check-edge-boundaries.mjs");
  run("node scripts/check-sql-safety.mjs");

  const skipMigrate = process.env.SKIP_MIGRATE === "1" ? "1" : "0";
  if (skipMigrate === "1") {
    console.warn("[check:deploy] SKIP_MIGRATE=1 — build sin migraciones\n");
  }

  run(`SKIP_MIGRATE=${skipMigrate} pnpm run build`);
  run("node scripts/smoke-production.mjs");

  console.log("═══ Listo para push / deploy ═══\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
