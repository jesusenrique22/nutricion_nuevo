#!/usr/bin/env node
/**
 * Plan de recuperación de medios:
 *   1) Probar MongoDB Atlas (GridFS) — diseño tal como estaba
 *   2) Si Atlas responde → migrar a public/uploads/ + actualizar Neon
 *   3) Si Atlas no tiene los archivos → listar qué falta en Neon para re-subir
 *
 * Uso:
 *   pnpm run media:restore          # diagnóstico (opción 1)
 *   pnpm run media:restore --migrate  # opción 2 (requiere Atlas activo)
 */
import { spawnSync } from "node:child_process";
import { GridFSBucket } from "mongodb";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";
import { createPrismaClient } from "./create-prisma-client.mjs";

ensureDatabaseEnv();

const migrate = process.argv.includes("--migrate");
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB ?? "nutricion_chat";

function collectMediaIds(value, out) {
  if (typeof value === "string") {
    const m = value.match(/\/api\/media\/([a-f0-9]{24})/i);
    if (m) out.add(m[1]);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaIds(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectMediaIds(item, out);
  }
}

async function cmsMediaIds(prisma) {
  const ids = new Set();
  const rows = await prisma.siteContent.findMany({ select: { data: true } });
  for (const row of rows) collectMediaIds(row.data, ids);

  const resources = await prisma.resource.findMany({
    select: { coverUrl: true, contentUrl: true, videoUrl: true },
  });
  for (const r of resources) {
    collectMediaIds(r.coverUrl, ids);
    collectMediaIds(r.contentUrl, ids);
    collectMediaIds(r.videoUrl, ids);
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { url: { startsWith: "/api/media/" } },
    select: { fileId: true, url: true },
  });
  for (const a of assets) {
    if (a.fileId) ids.add(a.fileId);
    collectMediaIds(a.url, ids);
  }

  return [...ids];
}

async function testMongo() {
  if (!uri) {
    return { ok: false, reason: "missing_uri" };
  }

  const { MongoClient } = await import("mongodb");
  const attempts = 5;
  let lastMessage = "";

  for (let i = 1; i <= attempts; i++) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 25_000,
      connectTimeoutMS: 25_000,
      autoSelectFamily: false,
      family: 4,
    });

    try {
      await client.connect();
      const db = client.db(dbName);
      await db.command({ ping: 1 });
      const bucket = new GridFSBucket(db, { bucketName: "media" });
      const gridCount = await bucket.find({}).toArray().then((f) => f.length);
      const collections = await db.listCollections().toArray();
      if (i > 1) console.log(`✓ Atlas respondió en el intento ${i}/${attempts}`);
      return {
        ok: true,
        gridCount,
        collections: collections.map((c) => c.name),
        client,
        db,
      };
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
      await client.close().catch(() => undefined);
      if (i < attempts) {
        console.warn(
          `[restore] Intento ${i}/${attempts} falló (${lastMessage}). Reintentando en 8s…`,
        );
        await new Promise((r) => setTimeout(r, 8_000));
      }
    }
  }

  return {
    ok: false,
    reason: "connection_failed",
    message: lastMessage,
  };
}

function printAtlasHelp() {
  console.log(`
── Opción 1: reactivar Atlas ──
1. console.mongodb.com → cluster en estado "Active" (Resume si está pausado)
2. Network Access → Add IP → tu IP o 0.0.0.0/0
3. Database Access → usuario con contraseña válida
4. Connect → Drivers → copiá la URI SRV en .env:
     MONGODB_URI="mongodb+srv://..."
     MONGODB_DB="nutricion_chat"
5. Volvé a ejecutar: pnpm run media:restore
`);
}

async function main() {
  console.log("═══ Recuperación de medios Anttova ═══\n");

  const prisma = createPrismaClient();
  const neededIds = await cmsMediaIds(prisma);
  console.log(`URLs /api/media/ en Neon (CMS): ${neededIds.length} archivo(s)`);
  if (neededIds.length > 0) {
    console.log(`  IDs: ${neededIds.slice(0, 6).join(", ")}${neededIds.length > 6 ? "…" : ""}`);
  }

  if (!uri) {
    console.error("\n✗ MONGODB_URI no está en .env — no se puede probar Atlas.\n");
    printAtlasHelp();
    process.exit(1);
  }

  console.log("\nProbando MongoDB Atlas…");
  const mongo = await testMongo();

  if (!mongo.ok) {
    console.error(`\n✗ Atlas no responde: ${mongo.message ?? mongo.reason}\n`);
    printAtlasHelp();
    console.log(`── Si Atlas no se recupera ──
Opción 2 (cuando Atlas vuelva un momento): pnpm run media:restore --migrate
Opción 3 (sin binarios en Atlas): re-subir imágenes en Personalizar, o export manual desde Atlas Backup.
`);
    process.exit(1);
  }

  console.log(`✓ Atlas conectado — ${mongo.gridCount} archivo(s) en GridFS (bucket "media")`);
  console.log(`  Colecciones: ${mongo.collections.join(", ") || "(ninguna)"}`);

  const bucket = new GridFSBucket(mongo.db, { bucketName: "media" });
  const missing = [];
  const found = [];

  for (const id of neededIds) {
    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(id)) {
      missing.push(id);
      continue;
    }
    const files = await bucket.find({ _id: new ObjectId(id) }).limit(1).toArray();
    if (files[0]) found.push(id);
    else missing.push(id);
  }

  await mongo.client.close();

  console.log(`\nEn GridFS: ${found.length}/${neededIds.length} archivos del CMS`);

  if (mongo.gridCount > 0 && migrate) {
    console.log("\n→ Ejecutando opción 2 (migrar a public/uploads/)…\n");
    const r = spawnSync("node", ["--env-file=.env", "scripts/migrate-media-to-local.mjs"], {
      stdio: "inherit",
      env: process.env,
      cwd: process.cwd(),
    });
    process.exit(r.status ?? 1);
  }

  if (found.length === neededIds.length && neededIds.length > 0) {
    console.log(`
✓ Opción 1 lista — reiniciá el servidor:
  pnpm run dev
Las imágenes deberían verse igual que antes.
`);
    process.exit(0);
  }

  if (found.length > 0 && missing.length > 0) {
    console.warn(`\n⚠ Faltan en GridFS: ${missing.join(", ")}`);
  }

  if (mongo.gridCount > 0) {
    console.log(`
── Siguiente paso ──
Atlas responde y hay archivos en GridFS.
  • Si el diseño ya se ve bien → listo (opción 1).
  • Para no depender de Atlas: pnpm run media:restore --migrate
`);
    process.exit(found.length > 0 ? 0 : 1);
  }

  console.error(`
✗ Atlas conecta pero GridFS está vacío.
Los binarios ya no están en Atlas → opción 3:
  • Re-subir imágenes en Dashboard → Personalizar
  • O restaurar desde backup de Atlas si tenés uno
`);
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      const prisma = createPrismaClient();
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
