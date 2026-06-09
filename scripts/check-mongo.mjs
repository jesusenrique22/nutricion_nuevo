#!/usr/bin/env node
/**
 * Verifica la conexión a MongoDB usando MONGODB_URI del .env
 * Uso: npm run db:check:mongo
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "";
const dbName = process.env.MONGODB_DB ?? "nutricion_chat";
const masked = uri.replace(/:([^:@/]+)@/, ":****@");

async function main() {
  console.log("Comprobando conexión a MongoDB…\n");
  console.log("MONGODB_URI:", masked || "(no definida)");
  console.log("MONGODB_DB:", dbName);

  if (!uri) {
    console.error("\n✗ Falta MONGODB_URI en .env");
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    const collections = await db.listCollections().toArray();
    console.log("\n✓ Conexión exitosa.");
    console.log(
      collections.length
        ? `✓ ${collections.length} colección(es): ${collections.map((c) => c.name).join(", ")}`
        : "✓ Base de datos vacía (normal en primera ejecución).",
    );
  } catch (error) {
    console.error("\n✗ Error de conexión:\n");
    if (error instanceof Error) {
      console.error(error.message);
    }
    console.error(`
Solución (desarrollo local):
1. Instala MongoDB: brew tap mongodb/brew && brew install mongodb-community
2. Inicia el servicio: brew services start mongodb/brew/mongodb-community
3. En .env usa:
   MONGODB_URI="mongodb://127.0.0.1:27017/?directConnection=true"
   MONGODB_DB="nutricion_chat"

Solución (MongoDB Atlas):
1. Crea un cluster en https://cloud.mongodb.com
2. Añade tu IP en Network Access
3. Copia la connection string (SRV) y ponla en MONGODB_URI
`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
