#!/usr/bin/env node
/**
 * Arranca `next start` y prueba rutas críticas en modo producción.
 * Detecta errores de middleware/proxy que `next dev` no replica igual.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.env.SMOKE_PORT || 3099);
const HOST = "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;
const START_TIMEOUT_MS = 60_000;

const ROUTES = [
  { path: "/login", label: "Login (proxy/middleware)" },
  { path: "/register", label: "Registro (proxy/middleware)" },
  { path: "/", label: "Landing" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer() {
  const deadline = Date.now() + START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/login`, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // server still booting
    }
    await sleep(500);
  }

  throw new Error(`next start no respondió en ${START_TIMEOUT_MS / 1000}s`);
}

async function runChecks() {
  const failures = [];

  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 500) {
        failures.push(`${route.label} (${route.path}): HTTP ${res.status}`);
      } else {
        console.log(`  ✓ ${route.path} → ${res.status}`);
      }
    } catch (err) {
      failures.push(`${route.label} (${route.path}): ${err.message}`);
    }
  }

  return failures;
}

async function main() {
  if (!existsSync(join(ROOT, ".next"))) {
    console.error("✗ Falta build (.next). Ejecutá antes: pnpm run build:local\n");
    process.exit(1);
  }

  console.log(`\nSmoke test producción en ${BASE}…\n`);

  const child = spawn("pnpm", ["exec", "next", "start", "-p", String(PORT), "-H", HOST], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
  });

  let stopped = false;
  function stopServer() {
    if (stopped) return;
    stopped = true;
    child.kill("SIGTERM");
  }

  process.on("SIGINT", stopServer);
  process.on("SIGTERM", stopServer);

  try {
    await waitForServer();
    const failures = await runChecks();

    if (failures.length) {
      console.error("\n✗ Smoke test falló:\n");
      for (const f of failures) console.error(`  • ${f}`);
      console.error(
        "\nEstos errores suelen aparecer en Vercel aunque dev local funcione.\n",
      );
      process.exit(1);
    }

    console.log("\n✓ Smoke test OK — rutas críticas responden sin 500\n");
  } finally {
    stopServer();
    await sleep(300);
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}\n`);
  process.exit(1);
});
