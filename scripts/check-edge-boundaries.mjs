#!/usr/bin/env node
/**
 * Archivos que corren en Edge (proxy/middleware en Vercel).
 * No pueden importar Prisma, bcrypt, fs, etc. — falla en prod con 500
 * aunque `next dev` en local parezca funcionar.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Punto de entrada del proxy (middleware). */
const EDGE_ENTRIES = ["src/proxy.ts"];

/** Cadena permitida desde proxy → auth-edge → auth.config */
const ALLOWED_LOCAL = {
  "src/proxy.ts": ["@/lib/auth-edge"],
  "src/lib/auth-edge.ts": ["@/lib/auth.config"],
  "src/lib/auth.config.ts": [],
};

const FORBIDDEN_VALUE_IMPORTS = [
  "@/lib/auth",
  "@/server/db/prisma",
  "@auth/prisma-adapter",
  "bcryptjs",
  "prisma",
  "@prisma/client",
  "node:fs",
  "node:module",
  "node:child_process",
];

function rel(filePath) {
  return filePath.replace(`${ROOT}/`, "");
}

function readSource(filePath) {
  const abs = resolve(ROOT, filePath);
  if (!existsSync(abs)) {
    throw new Error(`No se encontró ${filePath}`);
  }
  return readFileSync(abs, "utf8");
}

function parseImports(source) {
  const imports = [];
  const patterns = [
    /import\s+type\s+[\s\S]*?\sfrom\s+["']([^"']+)["']/g,
    /import\s+(?!type)[\s\S]*?\sfrom\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /export\s+[\s\S]*?\sfrom\s+["']([^"']+)["']/g,
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      imports.push({
        spec: m[1],
        typeOnly: m[0].includes("import type"),
      });
    }
  }

  return imports;
}

function resolveLocalImport(fromFile, spec) {
  if (!spec.startsWith("@/")) return null;

  const base = join(SRC, spec.slice(2));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

function collectEdgeFiles() {
  const files = new Set(EDGE_ENTRIES.map((f) => resolve(ROOT, f)));
  const queue = [...files];

  while (queue.length) {
    const abs = queue.pop();
    const fromRel = rel(abs);
    const source = readFileSync(abs, "utf8");
    const allowed = ALLOWED_LOCAL[fromRel] ?? null;

    for (const imp of parseImports(source)) {
      if (!imp.spec.startsWith("@/")) continue;

      if (allowed && !allowed.includes(imp.spec)) {
        throw new Error(
          `${fromRel}: import no permitido "${imp.spec}". ` +
            `En Edge solo: ${allowed.join(", ") || "(ninguno local)"}`,
        );
      }

      const resolved = resolveLocalImport(fromRel, imp.spec);
      if (resolved && !files.has(resolved)) {
        files.add(resolved);
        queue.push(resolved);
      }
    }
  }

  return [...files].map(rel);
}

function checkForbiddenImports(edgeFiles) {
  const errors = [];

  for (const file of edgeFiles) {
    const source = readSource(file);
    const isAuthConfig = file === "src/lib/auth.config.ts";

    for (const imp of parseImports(source)) {
      if (imp.typeOnly) {
        if (imp.spec === "@prisma/client" && isAuthConfig) continue;
        if (imp.typeOnly && !imp.spec.startsWith("@/")) continue;
      }

      const forbidden = FORBIDDEN_VALUE_IMPORTS.find(
        (f) => imp.spec === f || imp.spec.startsWith(`${f}/`),
      );

      if (forbidden) {
        if (forbidden === "@prisma/client" && imp.typeOnly && isAuthConfig) {
          continue;
        }
        errors.push(`${file}: import prohibido en Edge "${imp.spec}"`);
      }
    }
  }

  return errors;
}

function main() {
  console.log("Verificando límites Edge (proxy / middleware)…\n");

  let edgeFiles;
  try {
    edgeFiles = collectEdgeFiles();
  } catch (err) {
    console.error(`✗ ${err.message}\n`);
    console.error(
      "El proxy (src/proxy.ts) debe usar @/lib/auth-edge, no @/lib/auth.\n",
    );
    process.exit(1);
  }

  const errors = checkForbiddenImports(edgeFiles);

  if (errors.length) {
    console.error("✗ Edge importaría módulos de Node/DB (500 en Vercel):\n");
    for (const e of errors) console.error(`  • ${e}`);
    console.error(`
Usá auth-edge en proxy.ts y mantené Prisma solo en auth.ts / server actions.
`);
    process.exit(1);
  }

  console.log("✓ Archivos Edge revisados:");
  for (const f of edgeFiles) console.log(`  • ${f}`);
  console.log("\n✓ Sin imports prohibidos (Prisma, bcrypt, fs, etc.)");
}

main();
