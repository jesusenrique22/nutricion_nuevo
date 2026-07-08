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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    autoSelectFamily: false,
    family: 4,
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    serverSelectionTimeoutMS: 20_000,
    connectTimeoutMS: 20_000,
    socketTimeoutMS: 60_000,
  } as const;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("Falta la variable de entorno MONGODB_URI");
  }
  return normalizeMongoUri(uri);
}

function resetMongoConnection(): void {
  globalForMongo._mongoClientPromise = undefined;
  globalForMongo._mongoClient = undefined;
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

function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = getMongoClient()
      .connect()
      .catch((error) => {
        resetMongoConnection();
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

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

/**
 * Conexión tolerante a fallos. Intenta de verdad (sin caché que bloquee 45 s).
 * Atlas a veces tarda o corta con ECONNRESET — reintenta antes de rendirse.
 */
export async function tryGetMongoDb(): Promise<Db | null> {
  if (!isMongoConfigured()) return null;

  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await getMongoDb();
    } catch {
      resetMongoConnection();
      if (i < attempts) await sleep(2_000);
    }
  }
  return null;
}

// Colecciones tipadas (helpers de acceso)
export const Collections = {
  conversations: "conversations",
  messages: "messages",
  files: "files",
  notifications: "notifications",
} as const;

export default getClientPromise;
