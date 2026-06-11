import { MongoClient, Db, ServerApiVersion } from "mongodb";

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

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;

  await Promise.all([
    db
      .collection(Collections.conversations)
      .createIndex({ participants: 1, updatedAt: -1 }),
    db
      .collection(Collections.conversations)
      .createIndex(
        { patientId: 1, consultationCode: 1 },
        { unique: true },
      ),
    db
      .collection(Collections.messages)
      .createIndex({ conversationId: 1, createdAt: 1 }),
    db
      .collection(Collections.notifications)
      .createIndex({ recipientId: 1, isRead: 1, createdAt: -1 }),
    db
      .collection(Collections.files)
      .createIndex({ ownerId: 1, uploadedAt: -1 }),
  ]);
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
