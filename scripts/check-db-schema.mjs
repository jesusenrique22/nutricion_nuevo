#!/usr/bin/env node
/**
 * Verifica columnas críticas en PostgreSQL (migraciones aplicadas).
 * Evita deploys donde el código espera columnas que Neon aún no tiene.
 */
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

/** table → columnas requeridas por el código actual */
const REQUIRED_COLUMNS = {
  Payment: [
    "refundStatus",
    "advanceInboxDismissedAt",
    "remainderInboxDismissedAt",
    "advanceInboxTrashedAt",
    "remainderInboxTrashedAt",
    "patientPaymentMethod",
    "patientPaymentReference",
    "patientPaymentNote",
    "patientPaymentProofUrls",
  ],
  ResourcePurchase: [
    "refundStatus",
    "inboxDismissedAt",
    "inboxTrashedAt",
    "patientPaymentMethod",
    "patientPaymentReference",
    "patientPaymentNote",
    "patientPaymentProofUrls",
  ],
  ConsultationType: ["isPublished", "sortOrder", "imageUrl"],
};

async function main() {
  loadEnvFile();

  if (process.env.SKIP_DB_SCHEMA_CHECK === "1") {
    console.warn("[db-schema] SKIP_DB_SCHEMA_CHECK=1 — omitiendo verificación");
    return;
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.includes("localhost:5432/ci")) {
    console.warn("[db-schema] Sin DATABASE_URL real — omitiendo verificación");
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const missing = [];

    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1`,
        table,
      );

      const present = new Set(
        rows.map((r) => String(r.column_name)),
      );
      for (const col of columns) {
        if (!present.has(col)) {
          missing.push(`${table}.${col}`);
        }
      }
    }

    if (missing.length > 0) {
      console.error("\n✗ Faltan columnas en PostgreSQL (migraciones pendientes):\n");
      for (const m of missing) console.error(`  • ${m}`);
      console.error(`
Ejecutá contra Neon:
  pnpm exec prisma migrate deploy

O redeploy en Vercel (el build corre migrate deploy si DATABASE_URL está configurada).
`);
      process.exit(1);
    }

    console.log("✓ Esquema PostgreSQL al día (columnas críticas presentes)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[db-schema]", err);
  process.exit(1);
});
