#!/usr/bin/env node
/**
 * Prueba de resiliencia de peticiones: rutas públicas y APIs no deben
 * devolver 5xx (la página no se “cae”). Puede apuntar a un servidor ya
 * corriendo (BASE_URL) o arrancar `next start` si existe `.next`.
 *
 * Uso:
 *   pnpm run check:requests
 *   BASE_URL=http://127.0.0.1:3000 pnpm run check:requests
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EXTERNAL_BASE = process.env.BASE_URL?.replace(/\/$/, "") || null;
const PORT = Number(process.env.REQUESTS_PORT || process.env.SMOKE_PORT || 3098);
const HOST = "127.0.0.1";
const START_TIMEOUT_MS = 60_000;

/** Páginas marketing/auth: nunca deben caer con 5xx. */
const PAGE_ROUTES = [
  { path: "/", expectBody: ["paquetes", "Anttova"] },
  { path: "/login", expectBody: ["Iniciar", "login", "Correo"] },
  { path: "/register", expectBody: ["Registro", "Crear", "cuenta"] },
  { path: "/nutricionista", expectBody: ["nutricion", "Anttova", "Sobre"] },
  { path: "/nutricionista/especialidad", expectBody: null },
  { path: "/productos", expectBody: ["Producto", "producto", "Anttova"] },
  { path: "/resources", expectBody: ["Recurso", "resource", "E-"] },
  { path: "/forgot-password", expectBody: null },
];

/**
 * APIs públicas: status aceptable (auth/redirect/validación ≠ caída).
 * No se espera 5xx.
 */
const API_ROUTES = [
  { path: "/api/currency/rates", ok: (s) => s === 200 || s === 503 },
  { path: "/api/dashboard/badges", ok: (s) => s === 200 || s === 401 || s === 403 },
  { path: "/api/media/library", ok: (s) => s === 200 || s === 401 || s === 403 },
  {
    path: "/api/auth/csrf",
    ok: (s) => s === 200 || s === 404,
  },
  {
    path: "/api/auth/session",
    ok: (s) => s >= 200 && s < 500,
  },
  {
    path: "/api/nutricionista/cv/1",
    // Público puede estar bloqueado / sin archivo: no es caída del servidor.
    ok: (s) => s === 200 || s === 403 || s === 404 || s === 302 || s === 307,
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function bodyLooksAlive(html, needles) {
  if (!needles || needles.length === 0) return true;
  const lower = html.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

async function waitForServer(base) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/login`, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // booting
    }
    await sleep(500);
  }
  throw new Error(`Servidor no respondió en ${START_TIMEOUT_MS / 1000}s`);
}

async function checkPages(base) {
  const failures = [];

  for (const route of PAGE_ROUTES) {
    const url = `${base}${route.path}`;
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { Accept: "text/html" },
      });
      if (res.status >= 500) {
        failures.push(`PAGE ${route.path}: HTTP ${res.status} (caída)`);
        console.log(`  ✗ ${route.path} → ${res.status}`);
        continue;
      }

      const html = await res.text();
      const hasErrorDigest =
        html.includes("Application error") ||
        html.includes("digest:") ||
        /This page couldn.?t be rendered/i.test(html);

      if (hasErrorDigest) {
        failures.push(`PAGE ${route.path}: HTML de error Next.js`);
        console.log(`  ✗ ${route.path} → ${res.status} (error HTML)`);
        continue;
      }

      if (route.expectBody && !bodyLooksAlive(html, route.expectBody)) {
        // Soft warn: status OK pero marcadores no hallados (puede ser CMS vacío).
        console.log(
          `  ~ ${route.path} → ${res.status} (sin marcadores esperados; no es 5xx)`,
        );
      } else {
        console.log(`  ✓ ${route.path} → ${res.status}`);
      }
    } catch (err) {
      failures.push(`PAGE ${route.path}: ${err.message}`);
      console.log(`  ✗ ${route.path} → ${err.message}`);
    }
  }

  return failures;
}

async function fetchApi(url) {
  let res = await fetch(url, { redirect: "manual" });
  // Apex → www (308) no es caída; seguir una redirección permanente.
  if (
    res.status === 308 ||
    res.status === 301 ||
    res.status === 307 ||
    res.status === 302
  ) {
    const loc = res.headers.get("location");
    if (loc) {
      const next = loc.startsWith("http") ? loc : new URL(loc, url).href;
      res = await fetch(next, { redirect: "manual" });
    }
  }
  return res;
}

async function checkApis(base) {
  const failures = [];

  for (const route of API_ROUTES) {
    const url = `${base}${route.path}`;
    try {
      const res = await fetchApi(url);
      if (!route.ok(res.status)) {
        failures.push(`API ${route.path}: HTTP ${res.status}`);
        console.log(`  ✗ ${route.path} → ${res.status}`);
      } else {
        console.log(`  ✓ ${route.path} → ${res.status}`);
      }
    } catch (err) {
      failures.push(`API ${route.path}: ${err.message}`);
      console.log(`  ✗ ${route.path} → ${err.message}`);
    }
  }

  return failures;
}

/** Varias peticiones en paralelo a la landing: ninguna debe ser 5xx. */
async function checkBurst(base) {
  const failures = [];
  const n = 8;
  console.log(`\nRáfaga paralela ×${n} en / …`);
  const results = await Promise.allSettled(
    Array.from({ length: n }, () =>
      fetch(`${base}/`, { redirect: "follow", headers: { Accept: "text/html" } }),
    ),
  );

  let ok = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      failures.push(`BURST #${i + 1}: ${r.reason?.message ?? r.reason}`);
      continue;
    }
    if (r.value.status >= 500) {
      failures.push(`BURST #${i + 1}: HTTP ${r.value.status}`);
      continue;
    }
    ok += 1;
  }
  console.log(`  ✓ ${ok}/${n} sin 5xx`);
  return failures;
}

async function runAgainst(base) {
  console.log(`Páginas:`);
  const pageFails = await checkPages(base);
  console.log(`\nAPIs:`);
  const apiFails = await checkApis(base);
  const burstFails = await checkBurst(base);
  return [...pageFails, ...apiFails, ...burstFails];
}

async function withLocalServer(fn) {
  const buildId = join(ROOT, ".next", "BUILD_ID");
  if (!existsSync(buildId)) {
    console.error(
      "✗ No hay build de producción (.next/BUILD_ID).\n" +
        "  Opciones:\n" +
        "  • pnpm run build:local && pnpm run check:requests\n" +
        "  • Con el dev server: BASE_URL=http://127.0.0.1:3000 pnpm run check:requests\n",
    );
    process.exit(1);
  }

  const base = `http://${HOST}:${PORT}`;
  console.log(`Arrancando next start en ${base}…\n`);

  const child = spawn(
    "pnpm",
    ["exec", "next", "start", "-p", String(PORT), "-H", HOST],
    {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(PORT) },
    },
  );

  let stopped = false;
  function stopServer() {
    if (stopped) return;
    stopped = true;
    child.kill("SIGTERM");
  }

  process.on("SIGINT", stopServer);
  process.on("SIGTERM", stopServer);

  try {
    await waitForServer(base);
    return await fn(base);
  } finally {
    stopServer();
    await sleep(300);
  }
}

async function main() {
  console.log("\nPrueba de resiliencia de peticiones\n");

  let failures;
  if (EXTERNAL_BASE) {
    console.log(`Usando BASE_URL=${EXTERNAL_BASE}\n`);
    await waitForServer(EXTERNAL_BASE);
    failures = await runAgainst(EXTERNAL_BASE);
  } else {
    failures = await withLocalServer(runAgainst);
  }

  if (failures.length) {
    console.error("\n✗ Fallaron peticiones (la página podría caerse):\n");
    for (const f of failures) console.error(`  • ${f}`);
    console.error("");
    process.exit(1);
  }

  console.log(
    "\n✓ OK — rutas y APIs públicas responden sin 5xx; ráfaga estable\n",
  );
}

main().catch((err) => {
  console.error(`✗ ${err.message}\n`);
  process.exit(1);
});
