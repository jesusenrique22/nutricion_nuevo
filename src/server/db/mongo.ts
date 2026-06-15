import {
  type Collection,
  type CreateIndexesOptions,
  type Document,
  type IndexSpecification,
  MongoClient,
  Db,
  ServerApiVersion,
} from "mongodb";

const dbName = process.env.MONGODB_DB ?? "nutricion_chat";

const globalForMongo = globalThis as unknown as {
  _mongoClient: MongoClient | undefined;
  _mongoClientPromise: Promise<MongoClient> | undefined;
};

/** Asegura parámetros recomendados para Atlas + serverless (Vercel). */
function normalizeMongoUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;

  const hasQuery = trimmed.includes("?");
  const required = ["retryWrites=true", "w=majority"];
  const missing = required.filter(
    (p) => !trimmed.toLowerCase().includes(p.split("=")[0].toLowerCase()),
  );

  if (missing.length === 0) return trimmed;
  return `${trimmed}${hasQuery ? "&" : "?"}${missing.join("&")}`;
}

function getClientOptions() {
  return {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    // Evita fallos SSL/TLS en Vercel (IPv6 auto-select)
    autoSelectFamily: false,
    family: 4,
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 10_000,
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
  } as const;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("Falta la variable de entorno MONGODB_URI");
  }
  return normalizeMongoUri(uri);
}

function getMongoClient(): MongoClient {
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(
      getMongoUri(),
      getClientOptions(),
    );
  }
  return globalForMongo._mongoClient;
}

// Reutiliza la conexión entre invocaciones serverless (Vercel)
function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = getMongoClient()
      .connect()
      .catch((error) => {
        globalForMongo._mongoClientPromise = undefined;
        globalForMongo._mongoClient = undefined;
        throw error;
      });
  }
  return globalForMongo._mongoClientPromise;
}

let indexesEnsured = false;

async function safeDropIndex(
  collection: Collection<Document>,
  name: string,
): Promise<void> {
  try {
    await collection.dropIndex(name);
  } catch {
    // Índice ausente o ya eliminado
  }
}

/** Crea un índice; si hay conflicto de spec (p. ej. unique distinto), lo reemplaza. */
async function createIndexSafe(
  collection: Collection<Document>,
  spec: IndexSpecification,
  options?: CreateIndexesOptions,
): Promise<void> {
  try {
    await collection.createIndex(spec, options);
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 86) throw err;

    const name =
      options?.name ??
      Object.entries(spec)
        .map(([key, value]) => `${key}_${value}`)
        .join("_");

    await collection.dropIndex(name);
    await collection.createIndex(spec, options);
  }
}

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;

  const conversations = db.collection(Collections.conversations);

  await safeDropIndex(conversations, "patientId_1");

  await Promise.all([
    createIndexSafe(conversations, { participants: 1, updatedAt: -1 }),
    createIndexSafe(
      conversations,
      { patientId: 1, consultationTypeId: 1 },
      { unique: true },
    ),
    createIndexSafe(conversations, { patientId: 1, consultationCode: 1 }),
    createIndexSafe(conversations, { consultationCode: 1, updatedAt: -1 }),
    createIndexSafe(db.collection(Collections.messages), {
      conversationId: 1,
      createdAt: 1,
    }),
    createIndexSafe(db.collection(Collections.notifications), {
      recipientId: 1,
      isRead: 1,
      createdAt: -1,
    }),
    createIndexSafe(db.collection(Collections.files), {
      ownerId: 1,
      uploadedAt: -1,
    }),
  ]);

  indexesEnsured = true;
}

export async function getMongoDb(): Promise<Db> {
  const connectedClient = await getClientPromise();
  const db = connectedClient.db(dbName);
  await ensureIndexes(db);
  return db;
}

// Colecciones tipadas (helpers de acceso)
export const Collections = {
  conversations: "conversations",
  messages: "messages",
  files: "files",
  notifications: "notifications",
} as const;

export default getClientPromise;
