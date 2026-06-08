import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "nutricion_chat";

if (!uri) {
  throw new Error("Falta la variable de entorno MONGODB_URI");
}

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise: Promise<MongoClient> | undefined;
};

const client = new MongoClient(uri);

// Reutiliza la conexión en desarrollo (evita agotar conexiones con HMR)
const clientPromise: Promise<MongoClient> =
  globalForMongo._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}

// Colecciones tipadas (helpers de acceso)
export const Collections = {
  conversations: "conversations",
  messages: "messages",
  files: "files",
  notifications: "notifications",
} as const;

export default clientPromise;
