#!/usr/bin/env node
/**
 * Comprueba que no haya SQL crudo inseguro ($queryRawUnsafe / $executeRawUnsafe).
 * Prisma.$queryRaw con tagged template está parametrizado y es seguro.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");
const FORBIDDEN = ["$queryRawUnsafe", "$executeRawUnsafe"];

let failed = false;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs)$/.test(name)) continue;
    const src = readFileSync(path, "utf8");
    for (const token of FORBIDDEN) {
      if (src.includes(token)) {
        console.error(`[security] ${path}: usa ${token} (prohibido)`);
        failed = true;
      }
    }
  }
}

walk(ROOT);

if (failed) {
  process.exit(1);
}

console.log("[security] Sin $queryRawUnsafe / $executeRawUnsafe en src/");
