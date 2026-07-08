#!/usr/bin/env node
/** Ejecuta Prisma CLI con DATABASE_URL / DIRECT_DATABASE_URL normalizados para Neon. */
import { spawnSync } from "node:child_process";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";

ensureDatabaseEnv();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/prisma-cli.mjs <comando prisma> [args…]");
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "prisma", ...args], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
