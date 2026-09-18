import {
  type Collection,
  type CreateIndexesOptions,
  type Document,
  type IndexSpecification,
  MongoClient,
  Db,
  ServerApiVersion,
} from "mongodb";
import dns from "node:dns";

/** Atlas SRV: el DNS del router (10.x) suele fallar; Google/Cloudflare lo resuelven. */
if (
  process.env.MONGODB_URI?.includes("mongodb+srv://") &&
  process.env.MONGODB_USE_SYSTEM_DNS !== "1"
) {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

const dbName = process.env.MONGODB_DB ?? "nutricion_chat";

const globalForMongo = globalThis as unknown as {
  _mongoClient: MongoClient | undefined;
  _mongoClientPromise: Promise<MongoClient> | undefined;
  _mongoDownUntil: number | undefined;
};

/**
 * Ventana de corte tras un fallo de conexión.
 *
 * Con Atlas caído, cada petición volvía a esperar el tiempo completo antes de
 * rendirse: subir un archivo se iba a decenas de segundos y parecía colgado.
 * Durante esta ventana se responde "no disponible" al instante; es corta para
 * que el servicio se recupere solo apenas Atlas vuelva.
 */
const MONGO_DOWN_WINDOW_MS = 15_000;

function isMongoInDownWindow(): boolean {
  const until = globalForMongo._mongoDownUntil;
  return typeof until === "number" && Date.now() < until;
}

function markMongoDown(): void {
  globalForMongo._mongoDownUntil = Date.now() + MONGO_DOWN_WINDOW_MS;
}

function markMongoUp(): void {
  globalForMongo._mongoDownUntil = undefined;
}

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
    throw new Error("No pudimos conectar con el almacenamiento de archivos.");
  }
  return normalizeMongoUri(uri);
}

function isTopologyClosedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "MongoTopologyClosedError" ||
    error.message.includes("Topology is closed")
  );
}

function resetMongoConnection(): void {
  const previous = globalForMongo._mongoClient;
  globalForMongo._mongoClientPromise = undefined;
  globalForMongo._mongoClient = undefined;
  if (previous) {
    void previous.close().catch(() => {});
  }
}

async function pingClient(
  client: MongoClient,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await Promise.race([
      client.db(dbName).command({ ping: 1 }),
      sleep(timeoutMs).then(() => {
        throw new Error("mongo-ping-timeout");
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** Cliente conectado; reabre si la topología quedó cerrada (VPN, idle, hot reload). */
async function getConnectedClient(): Promise<MongoClient> {
  if (globalForMongo._mongoClient) {
    if (await pingClient(globalForMongo._mongoClient, 2_500)) {
      return globalForMongo._mongoClient;
    }
    resetMongoConnection();
  }

  if (globalForMongo._mongoClientPromise) {
    try {
      const client = await globalForMongo._mongoClientPromise;
      if (await pingClient(client, 2_500)) {
        globalForMongo._mongoClient = client;
        return client;
      }
    } catch {
      /* reconectar abajo */
    }
    resetMongoConnection();
  }

  const client = new MongoClient(getMongoUri(), getClientOptions());
  await client.connect();
  globalForMongo._mongoClient = client;
  globalForMongo._mongoClientPromise = Promise.resolve(client);
  return client;
}

function getClientPromise(): Promise<MongoClient> {
  return getConnectedClient();
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
 * Lectura tolerante con timeout corto (evita ~80s de espera en /api/media cuando Atlas no responde).
 */
export async function tryGetMongoDbFast(): Promise<Db | null> {
  if (!isMongoConfigured()) return null;

  if (globalForMongo._mongoClient) {
    if (await pingClient(globalForMongo._mongoClient, 2_500)) {
      markMongoUp();
      return globalForMongo._mongoClient.db(dbName);
    }
    resetMongoConnection();
  }

  if (isMongoInDownWindow()) return null;

  const client = new MongoClient(getMongoUri(), {
    ...getClientOptions(),
    serverSelectionTimeoutMS: 4_000,
    connectTimeoutMS: 4_000,
    socketTimeoutMS: 10_000,
  });

  try {
    await client.connect();
    globalForMongo._mongoClient = client;
    globalForMongo._mongoClientPromise = Promise.resolve(client);
    markMongoUp();
    return client.db(dbName);
  } catch {
    await client.close().catch(() => {});
    markMongoDown();
    return null;
  }
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
      const db = await getMongoDb();
      markMongoUp();
      return db;
    } catch (err) {
      resetMongoConnection();
      if (i < attempts) await sleep(isTopologyClosedError(err) ? 500 : 2_000);
    }
  }
  markMongoDown();
  return null;
}

/**
 * Igual que tryGetMongoDb pero con un techo de espera.
 *
 * Los reintentos completos pueden pasar del minuto (3 × serverSelectionTimeout);
 * en una petición eso agota el límite de la función serverless y quien subía el
 * archivo ve la subida colgada en vez de un error que explique qué pasó. El
 * reintento sigue en segundo plano: si Atlas despierta, la conexión queda
 * cacheada para la próxima.
 */
export async function tryGetMongoDbWithin(
  deadlineMs: number,
): Promise<Db | null> {
  if (!isMongoConfigured()) return null;

  // Reutilizar un cliente sano no cuesta nada; solo se corta si hay que
  // reconectar y acabamos de fallar.
  if (globalForMongo._mongoClient && (await pingClient(globalForMongo._mongoClient, 2_500))) {
    markMongoUp();
    return globalForMongo._mongoClient.db(dbName);
  }
  if (isMongoInDownWindow()) return null;

  return Promise.race([
    tryGetMongoDb().catch(() => null),
    sleep(deadlineMs).then(() => null),
  ]);
}

/** Ejecuta una lectura GridFS reintentando si la topología Mongo quedó cerrada. */
/**
 * Techo por defecto para operaciones dentro de una petición.
 *
 * Sin él, dos intentos de selección de servidor suman ~40 s y la función
 * serverless se corta antes de poder responder nada útil.
 */
const MONGO_OPERATION_DEADLINE_MS = 12_000;

export async function withMongoDb<T>(
  fn: (db: Db) => Promise<T>,
  options?: { deadlineMs?: number },
): Promise<T | null> {
  if (!isMongoConfigured()) return null;

  const deadlineMs = options?.deadlineMs ?? MONGO_OPERATION_DEADLINE_MS;

  const run = async (): Promise<T | null> => {
    for (let i = 1; i <= 2; i++) {
      try {
        const db = await getMongoDb();
        return await fn(db);
      } catch (err) {
        resetMongoConnection();
        if (!isTopologyClosedError(err) || i === 2) return null;
      }
    }
    return null;
  };

  return Promise.race([run(), sleep(deadlineMs).then(() => null)]);
}

// Colecciones tipadas (helpers de acceso)
export const Collections = {
  conversations: "conversations",
  messages: "messages",
  files: "files",
  notifications: "notifications",
} as const;

export default getClientPromise;
