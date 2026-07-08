#!/usr/bin/env node
/**
 * Aplica SQL de migración vía driver WebSocket de Neon (cuando migrate deploy falla por TCP).
 * Uso: node scripts/apply-migration-sql.mjs prisma/migrations/20260708120000_product_cart/migration.sql
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Uso: node scripts/apply-migration-sql.mjs <ruta/migration.sql>");
  process.exit(1);
}

ensureDatabaseEnv();

const require = createRequire(import.meta.url);
const { neonConfig, Pool } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = readFileSync(resolve(sqlFile), "utf8");

// Ejecutar cada sentencia por separado (ALTER TYPE no puede ir en transacción con otros)
const statements = sql
  .split(";")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter(Boolean);

try {
  for (const stmt of statements) {
    console.log(`→ ${stmt.slice(0, 60).replace(/\s+/g, " ")}…`);
    await pool.query(stmt);
  }
  console.log("\n✓ Migración aplicada.");
} catch (err) {
  console.error("\n✗ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await pool.end();
}
