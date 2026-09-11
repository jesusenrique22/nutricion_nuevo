#!/usr/bin/env node
/**
 * Bot E2E: simula un cliente navegando la app (público + paciente + admin).
 * Usa `pnpm dlx` para NO instalar Playwright en el proyecto (evita romper Turbopack).
 *
 * Uso:
 *   pnpm run test:e2e:dev     → contra dev en :3000 (recomendado si ya tenés pnpm dev)
 *   pnpm run test:e2e         → levanta next start si hace falta
 *   pnpm run test:e2e:ui      → modo visual interactivo
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

function loadEnv() {
  const path = resolve(ROOT, ".env");
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

loadEnv();

const args = process.argv.slice(2);
const ui = args.includes("--ui");
const dev = args.includes("--dev") || process.env.E2E_SKIP_WEBSERVER === "1";

console.log("\n🤖 Bot E2E Anttova — recorrido tipo cliente\n");

if (!process.env.E2E_PATIENT_EMAIL?.trim()) {
  console.warn(
    "⚠  Sin E2E_PATIENT_EMAIL: se omitirán pruebas de paciente logueado.\n" +
      "   Agregá en .env:\n" +
      "   E2E_PATIENT_EMAIL=tu-paciente@email.com\n" +
      "   E2E_PATIENT_PASSWORD=********\n",
  );
}

if (
  !process.env.E2E_ADMIN_EMAIL?.trim() &&
  process.env.E2E_USE_SEED_ADMIN !== "1"
) {
  console.warn(
    "ℹ  Pruebas admin omitidas. Para incluirlas:\n" +
      "   E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=...\n" +
      "   o E2E_USE_SEED_ADMIN=1 (admin@gmail.com / Admin123! del seed)\n",
  );
}

const playwrightArgs = [
  "dlx",
  "@playwright/test@1.63.0",
  "playwright",
  "test",
  "--config=e2e/playwright.config.ts",
];
if (ui) playwrightArgs.push("--ui");

const env = {
  ...process.env,
  ...(dev
    ? {
        E2E_SKIP_WEBSERVER: "1",
        E2E_BASE_URL: process.env.E2E_BASE_URL || "http://localhost:3000",
      }
    : {}),
};

const result = spawnSync("pnpm", playwrightArgs, {
  cwd: ROOT,
  stdio: "inherit",
  env,
});

if (result.status === 0) {
  console.log("\n✓ Bot E2E terminó OK");
  console.log("  Reporte HTML: playwright-report/index.html\n");
} else {
  console.error("\n✗ Bot E2E encontró fallos — revisá playwright-report/\n");
  process.exit(result.status ?? 1);
}
