#!/usr/bin/env node
/**
 * Verifica la conexión a MongoDB usando MONGODB_URI del .env
 * Uso: npm run db:check:mongo
 */
import dns from "node:dns";
import { lookup, resolveSrv } from "node:dns/promises";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "";
const dbName = process.env.MONGODB_DB ?? "nutricion_chat";
const masked = uri.replace(/:([^:@/]+)@/, ":****@");
const isSrv = uri.startsWith("mongodb+srv://");

function hostnameFromUri(value) {
  const match = value.match(/@([^/?]+)/);
  return match?.[1] ?? null;
}

function usePublicDns() {
  if (process.env.MONGODB_USE_SYSTEM_DNS !== "1") {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
}

async function checkDns(host) {
  usePublicDns();
  try {
    if (isSrv) {
      await resolveSrv(`_mongodb._tcp.${host}`);
      return true;
    }
    await lookup(host);
    return true;
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "ENOTFOUND" || code === "ENODATA") {
      console.error(`\n✗ No se pudo resolver "${host}" en DNS.`);
      if (isSrv) {
        console.error(
          "  Verificá que el cluster exista en Atlas y que el connection string sea el actual.",
        );
      } else {
        console.error(
          "  El host fue borrado o el MONGODB_URI está mal copiado.",
        );
      }
      console.error(
        "  Tip Mac: si tu Wi‑Fi usa DNS 10.x, el fix ya usa 8.8.8.8 en este script.",
      );
      return false;
    }
    console.error(`\n✗ No se pudo resolver "${host}" (${code || "error DNS"}).`);
    return false;
  }
}

function printAtlasHelp(errorMessage = "", publicIp = "") {
  const ipHint =
    errorMessage.includes("ECONNRESET") ||
    errorMessage.includes("timed out")
      ? `
⚠ Atlas está rechazando la conexión (el puerto 27017 responde, pero el handshake falla).
  Casi siempre es Network Access — tu IP actual debe estar permitida.

  Atlas → Network Access → Add IP Address:
  ${publicIp ? `  → Agregá esta IP: ${publicIp}` : "  → Add Current IP Address"}
  → O usá 0.0.0.0/0 (necesario para Vercel; permite cualquier IP)

  Esperá ~1 minuto después de guardar y volvé a correr: pnpm db:check:mongo
`
      : "";

  console.error(`
Solución (MongoDB Atlas) — tu URI bd.korvkyo.mongodb.net es válida:
1. Network Access → agregá tu IP${publicIp ? ` (${publicIp})` : ""} o 0.0.0.0/0
2. Verificá que el cluster no esté pausado (Free tier → Resume)
3. Database Access → usuario david30249427_db_user con contraseña correcta
4. MONGODB_URI SRV + MONGODB_DB=nutricion_chat
${ipHint}
Solución (desarrollo local sin Atlas):
   MONGODB_URI="mongodb://127.0.0.1:27017/?directConnection=true"
`);
}

async function fetchPublicIp() {
  try {
    const res = await fetch("https://api.ipify.org", {
      signal: AbortSignal.timeout(5000),
    });
    const ip = (await res.text()).trim();
    return ip || "";
  } catch {
    return "";
  }
}

async function main() {
  console.log("Comprobando conexión a MongoDB…\n");
  console.log("MONGODB_URI:", masked || "(no definida)");
  console.log("MONGODB_DB:", dbName);

  if (!uri) {
    console.error("\n✗ Falta MONGODB_URI en .env");
    process.exit(1);
  }

  const host = hostnameFromUri(uri);
  if (host && !host.includes("127.0.0.1") && !host.includes("localhost")) {
    const dnsOk = await checkDns(host);
    if (!dnsOk) {
      process.exit(1);
    }
  }

  usePublicDns();

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15_000,
    autoSelectFamily: false,
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    const collections = await db.listCollections().toArray();

    let gridCount = 0;
    const hasMedia = collections.some((c) => c.name === "media.files");
    if (hasMedia) {
      const { GridFSBucket } = await import("mongodb");
      const bucket = new GridFSBucket(db, { bucketName: "media" });
      gridCount = await bucket.find({}).toArray().then((f) => f.length);
    }

    console.log("\n✓ Conexión exitosa.");
    console.log(
      collections.length
        ? `✓ ${collections.length} colección(es): ${collections.map((c) => c.name).join(", ")}`
        : "✓ Base de datos vacía (normal en primera ejecución).",
    );
    if (hasMedia) {
      console.log(`✓ GridFS "media": ${gridCount} archivo(s)`);
    }
  } catch (error) {
    console.error("\n✗ Error de conexión:\n");
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    const publicIp = await fetchPublicIp();
    if (publicIp) {
      console.error(`\nTu IP pública ahora: ${publicIp}`);
    }
    printAtlasHelp(message, publicIp);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
