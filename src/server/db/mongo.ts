import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "nutricion_chat";

if (!uri) {
  throw new Error("Falta la variable de entorno MONGODB_URI");
}

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise: Promise<MongoClient> | undefined;
};

const clientOptions = {
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
};

const client = new MongoClient(uri, clientOptions);

// Reutiliza la conexión en desarrollo (evita agotar conexiones con HMR)
function getClientPromise(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = client.connect().catch((error) => {
      globalForMongo._mongoClientPromise = undefined;
      throw error;
    });
  }
  return globalForMongo._mongoClientPromise;
}

const clientPromise = getClientPromise();

let indexesEnsured = false;

async function ensureIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;

  await Promise.all([
    db
      .collection(Collections.conversations)
      .createIndex({ participants: 1, updatedAt: -1 }),
    db
      .collection(Collections.messages)
      .createIndex({ conversationId: 1, createdAt: 1 }),
    db
      .collection(Collections.notifications)
      .createIndex({ recipientId: 1, isRead: 1, createdAt: -1 }),
    db.collection(Collections.files).createIndex({ ownerId: 1, uploadedAt: -1 }),
  ]);
}

export async function getMongoDb(): Promise<Db> {
  const connectedClient = await clientPromise;
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

export default clientPromise;
