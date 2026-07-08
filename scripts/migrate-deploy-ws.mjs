#!/usr/bin/env node
/**
 * Aplica migraciones pendientes vía driver WebSocket de Neon.
 * Fallback cuando `prisma migrate deploy` falla con P1001 (TCP bloqueado o Neon dormido).
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";

ensureDatabaseEnv();

const require = createRequire(import.meta.url);
const { neonConfig, Pool } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

const MIGRATIONS_DIR = resolve(process.cwd(), "prisma/migrations");

function checksum(sql) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name !== "migration_lock.toml")
    .sort()
    .map((name) => {
      const file = join(MIGRATIONS_DIR, name, "migration.sql");
      const sql = readFileSync(file, "utf8");
      return { name, sql };
    });
}

function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("✗ Falta DATABASE_URL");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    await pool.query("SELECT 1");

    const { rows } = await pool.query(
      `SELECT migration_name::text AS migration_name
       FROM "_prisma_migrations"
       WHERE rolled_back_at IS NULL`,
    );
    const applied = new Set(rows.map((r) => r.migration_name));
    const pending = listMigrationFiles().filter((m) => !applied.has(m.name));

    if (pending.length === 0) {
      console.log("✓ Sin migraciones pendientes (WebSocket)");
      return;
    }

    console.log(
      `[migrate-ws] Aplicando ${pending.length} migración(es) pendiente(s)…`,
    );

    for (const migration of pending) {
      console.log(`\n→ ${migration.name}`);
      const statements = splitStatements(migration.sql);

      for (const stmt of statements) {
        const preview = stmt.slice(0, 72).replace(/\s+/g, " ");
        console.log(`   ${preview}…`);
        try {
          await pool.query(stmt);
        } catch (err) {
          const code = err && typeof err === "object" && "code" in err ? err.code : "";
          // 42710 = duplicate_object, 42P07 = duplicate_table — objeto ya aplicado manualmente
          if (code === "42710" || code === "42P07") {
            console.warn(`   (omitido: ya existe — ${code})`);
            continue;
          }
          throw err;
        }
      }

      const sum = checksum(migration.sql);
      const id = randomUUID();
      const now = new Date();

      await pool.query(
        `INSERT INTO "_prisma_migrations" (
          id, checksum, finished_at, migration_name, logs,
          rolled_back_at, started_at, applied_steps_count
        ) VALUES ($1, $2, $3, $4, $5, NULL, $6, $7)`,
        [id, sum, now, migration.name, "", now, 1],
      );
    }

    console.log("\n✓ Migraciones aplicadas vía WebSocket");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n✗ migrate-deploy-ws:", err instanceof Error ? err.message : err);
  process.exit(1);
});
