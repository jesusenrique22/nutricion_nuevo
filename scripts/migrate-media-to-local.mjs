#!/usr/bin/env node
/**
 * Exporta archivos de MongoDB GridFS a public/uploads/ y actualiza URLs en Neon.
 * Ejecutar UNA vez mientras Atlas responde, para dejar de depender de Mongo en medios.
 *
 * Uso: pnpm run db:migrate-media-local
 */
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { GridFSBucket, ObjectId } from "mongodb";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";
import { createPrismaClient } from "./create-prisma-client.mjs";

ensureDatabaseEnv();

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("✗ Falta MONGODB_URI en .env (necesario para leer GridFS una vez).");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB ?? "nutricion_chat";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function connectMongoWithRetry() {
  const { MongoClient } = await import("mongodb");
  const attempts = 5;
  let lastErr;

  for (let i = 1; i <= attempts; i++) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 25_000,
      connectTimeoutMS: 25_000,
      autoSelectFamily: false,
      family: 4,
    });
    try {
      await client.connect();
      await client.db(dbName).command({ ping: 1 });
      if (i > 1) console.log(`✓ Atlas respondió en el intento ${i}/${attempts}`);
      return client;
    } catch (err) {
      lastErr = err;
      await client.close().catch(() => undefined);
      if (i < attempts) {
        console.warn(
          `[migrate] Intento ${i}/${attempts} falló (${err instanceof Error ? err.message : err}). Reintentando en 8s…`,
        );
        await sleep(8_000);
      }
    }
  }
  throw lastErr;
}

const client = await connectMongoWithRetry();

function extFromMime(mime) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
  };
  return map[mime] ?? "";
}

function replaceMediaUrls(value, urlMap) {
  if (typeof value === "string") {
    const match = value.match(/^\/api\/media\/([^/?#]+)/);
    if (!match) return value;
    return urlMap.get(match[1]) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceMediaUrls(item, urlMap));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = replaceMediaUrls(item, urlMap);
    }
    return out;
  }
  return value;
}

try {
  const db = client.db(dbName);
  const bucket = new GridFSBucket(db, { bucketName: "media" });
  const files = await bucket.find({}).toArray();

  if (files.length === 0) {
    console.log("No hay archivos en GridFS.");
    process.exit(0);
  }

  console.log(`Encontrados ${files.length} archivo(s) en GridFS…\n`);

  const urlMap = new Map();
  const prisma = createPrismaClient();

  for (const file of files) {
    const id = file._id.toString();
    const meta = file.metadata ?? {};
    const folder =
      typeof meta.folder === "string" && meta.folder.trim()
        ? meta.folder.trim()
        : "site";
    const mime =
      typeof meta.mimeType === "string" ? meta.mimeType : "application/octet-stream";
    const ext = path.extname(file.filename ?? "") || extFromMime(mime) || "";
    const safeName = `${id}${ext}`;
    const relDir = path.join("uploads", folder);
    const absDir = path.join(process.cwd(), "public", relDir);
    const absFile = path.join(absDir, safeName);
    const publicUrl = `/${relDir.replace(/\\/g, "/")}/${safeName}`;

    await mkdir(absDir, { recursive: true });
    await pipeline(
      bucket.openDownloadStream(file._id),
      createWriteStream(absFile),
    );

    urlMap.set(id, publicUrl);
    console.log(`✓ ${id} → ${publicUrl}`);

    await prisma.mediaAsset.updateMany({
      where: { OR: [{ fileId: id }, { url: `/api/media/${id}` }] },
      data: {
        url: publicUrl,
        fileId: null,
        provider: "local",
        mimeType: mime,
      },
    });
  }

  const cmsRows = await prisma.siteContent.findMany({
    select: { id: true, slug: true, data: true },
  });

  let cmsUpdated = 0;
  for (const row of cmsRows) {
    const next = replaceMediaUrls(row.data, urlMap);
    if (JSON.stringify(next) !== JSON.stringify(row.data)) {
      await prisma.siteContent.update({
        where: { id: row.id },
        data: { data: next },
      });
      cmsUpdated += 1;
      console.log(`✓ CMS actualizado: ${row.slug}`);
    }
  }

  const resourceRows = await prisma.resource.findMany({
    where: {
      OR: [
        { coverUrl: { startsWith: "/api/media/" } },
        { contentUrl: { startsWith: "/api/media/" } },
        { videoUrl: { startsWith: "/api/media/" } },
      ],
    },
    select: { id: true, coverUrl: true, contentUrl: true, videoUrl: true },
  });

  for (const r of resourceRows) {
    await prisma.resource.update({
      where: { id: r.id },
      data: {
        coverUrl: r.coverUrl ? replaceMediaUrls(r.coverUrl, urlMap) : r.coverUrl,
        contentUrl: r.contentUrl
          ? replaceMediaUrls(r.contentUrl, urlMap)
          : r.contentUrl,
        videoUrl: r.videoUrl ? replaceMediaUrls(r.videoUrl, urlMap) : r.videoUrl,
      },
    });
  }

  if (resourceRows.length > 0) {
    console.log(`✓ ${resourceRows.length} recurso(s) actualizado(s)`);
  }

  console.log(`
Listo: ${urlMap.size} archivo(s) en public/uploads/, ${cmsUpdated} bloque(s) CMS en Neon.
Podés quitar MONGODB_URI del .env si ya no lo necesitás para chat.
Reiniciá el dev server y recargá la portada.
`);
} catch (err) {
  console.error("\n✗", err instanceof Error ? err.message : err);
  console.error(`
No se pudo leer MongoDB. Para recuperar el diseño original:
  1. Activá el cluster en console.mongodb.com
  2. Network Access → permití tu IP
  3. Copiá MONGODB_URI en .env y volvé a ejecutar este script
`);
  process.exit(1);
} finally {
  await client.close().catch(() => undefined);
}
