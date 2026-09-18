import { Binary, ObjectId } from "mongodb";
import { tryGetMongoDbWithin } from "@/server/db/mongo";
import type { UploadKind } from "@/lib/upload-policy";
import { validateUploadBuffer } from "@/lib/upload-policy";
import {
  storePublicBuffer,
  type StoredFile,
} from "@/server/services/file-storage";

const SESSIONS = "upload_sessions";
const CHUNKS = "upload_chunks";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Techo de espera por petición.
 *
 * Los reintentos completos de tryGetMongoDb suman ~64 s, más que el maxDuration
 * de 60 s de la ruta: la función se cortaba sola y devolvía un 500 sin cuerpo,
 * así que el panel no podía ni decir qué había fallado.
 */
const MONGO_DEADLINE_MS = 12_000;

const STORAGE_DOWN_MESSAGE =
  "No pudimos conectar con el almacenamiento de archivos (MongoDB Atlas). Revisá que el cluster esté activo y que la IP del servidor esté permitida en Network Access.";

export type UploadSessionInfo = {
  sessionId: string;
  totalChunks: number;
  chunkSize: number;
};

type SessionDoc = {
  _id: ObjectId;
  ownerId: string;
  fileName: string;
  mimeType: string;
  folder: string;
  kind: UploadKind;
  totalSize: number;
  totalChunks: number;
  receivedChunks: number[];
  createdAt: Date;
  expiresAt: Date;
};

/**
 * El fragmento se guarda como Buffer, pero al releerlo el driver lo devuelve
 * como `Binary` de BSON, no como Buffer. Tipar el campo como Buffer escondía
 * esa diferencia y `Buffer.concat` reventaba al ensamblar el archivo.
 */
type ChunkDoc = {
  sessionId: ObjectId;
  chunkIndex: number;
  data: Buffer | Binary;
};

/** Normaliza lo que devuelva el driver (Binary, Uint8Array o Buffer) a Buffer. */
function chunkToBuffer(data: unknown, chunkIndex: number): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Binary) return Buffer.from(data.buffer);
  if (data instanceof Uint8Array) return Buffer.from(data);
  throw new Error(
    `El fragmento ${chunkIndex + 1} llegó en un formato inesperado. Volvé a subir el archivo.`,
  );
}

function chunkCollection(db: Awaited<ReturnType<typeof tryGetMongoDbWithin>>) {
  if (!db) throw new Error("MongoDB no disponible para subidas grandes.");
  return db.collection<ChunkDoc>(CHUNKS);
}

function sessionCollection(db: Awaited<ReturnType<typeof tryGetMongoDbWithin>>) {
  if (!db) throw new Error("MongoDB no disponible para subidas grandes.");
  return db.collection<SessionDoc>(SESSIONS);
}

export async function initChunkedUpload(input: {
  ownerId: string;
  fileName: string;
  mimeType: string;
  folder: string;
  kind: UploadKind;
  totalSize: number;
  totalChunks: number;
}): Promise<UploadSessionInfo> {
  const db = await tryGetMongoDbWithin(MONGO_DEADLINE_MS);
  if (!db) {
    throw new Error(STORAGE_DOWN_MESSAGE);
  }

  const now = new Date();
  const sessionId = new ObjectId();
  await sessionCollection(db).insertOne({
    _id: sessionId,
    ownerId: input.ownerId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    folder: input.folder,
    kind: input.kind,
    totalSize: input.totalSize,
    totalChunks: input.totalChunks,
    receivedChunks: [],
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });

  return {
    sessionId: sessionId.toString(),
    totalChunks: input.totalChunks,
    chunkSize: Math.ceil(input.totalSize / input.totalChunks),
  };
}

export async function storeChunkedUploadPart(input: {
  sessionId: string;
  ownerId: string;
  chunkIndex: number;
  data: Buffer;
}): Promise<{ received: number; total: number }> {
  if (!ObjectId.isValid(input.sessionId)) {
    throw new Error("Sesión de subida inválida.");
  }

  const db = await tryGetMongoDbWithin(MONGO_DEADLINE_MS);
  if (!db) {
    throw new Error(STORAGE_DOWN_MESSAGE);
  }

  const sessions = sessionCollection(db);
  const session = await sessions.findOne({ _id: new ObjectId(input.sessionId) });
  if (!session || session.ownerId !== input.ownerId) {
    throw new Error("Sesión de subida no encontrada o expirada.");
  }

  if (input.chunkIndex < 0 || input.chunkIndex >= session.totalChunks) {
    throw new Error("Índice de fragmento inválido.");
  }

  const chunks = chunkCollection(db);
  await chunks.replaceOne(
    { sessionId: session._id, chunkIndex: input.chunkIndex },
    { sessionId: session._id, chunkIndex: input.chunkIndex, data: input.data },
    { upsert: true },
  );

  const receivedChunks = session.receivedChunks.includes(input.chunkIndex)
    ? session.receivedChunks
    : [...session.receivedChunks, input.chunkIndex].sort((a, b) => a - b);

  await sessions.updateOne(
    { _id: session._id },
    { $set: { receivedChunks } },
  );

  return { received: receivedChunks.length, total: session.totalChunks };
}

export async function completeChunkedUpload(input: {
  sessionId: string;
  ownerId: string;
}): Promise<StoredFile & { folder: string; fileName: string }> {
  if (!ObjectId.isValid(input.sessionId)) {
    throw new Error("Sesión de subida inválida.");
  }

  const db = await tryGetMongoDbWithin(MONGO_DEADLINE_MS);
  if (!db) {
    throw new Error(STORAGE_DOWN_MESSAGE);
  }

  const sessions = sessionCollection(db);
  const session = await sessions.findOne({ _id: new ObjectId(input.sessionId) });
  if (!session || session.ownerId !== input.ownerId) {
    throw new Error("Sesión de subida no encontrada o expirada.");
  }

  if (session.receivedChunks.length !== session.totalChunks) {
    throw new Error(
      `Faltan fragmentos (${session.receivedChunks.length}/${session.totalChunks}).`,
    );
  }

  const chunks = chunkCollection(db);
  const parts = await chunks
    .find({ sessionId: session._id })
    .sort({ chunkIndex: 1 })
    .toArray();

  if (parts.length !== session.totalChunks) {
    throw new Error("No se encontraron todos los fragmentos del archivo.");
  }

  const buffer = Buffer.concat(
    parts.map((part) => chunkToBuffer(part.data, part.chunkIndex)),
  );
  if (buffer.length !== session.totalSize) {
    throw new Error(
      `Tamaño incorrecto (${buffer.length} bytes, esperado ${session.totalSize}).`,
    );
  }

  const validation = validateUploadBuffer(
    buffer,
    session.fileName,
    session.mimeType,
    session.kind,
  );
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  // Los fragmentos llegan por separado: si alguno se mezcló, el tamaño puede
  // cuadrar pero el PDF ya no abre. La cabecera lo detecta antes de guardarlo.
  if (
    session.kind === "pdf" &&
    buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new Error(
      "El archivo no es un PDF válido. Probá exportarlo de nuevo.",
    );
  }

  const stored = await storePublicBuffer(buffer, session.folder, {
    fileName: session.fileName,
    mimeType: validation.mime,
    ownerId: input.ownerId,
  });

  await cleanupChunkedUpload(session._id);
  return { ...stored, folder: session.folder, fileName: session.fileName };
}

async function cleanupChunkedUpload(sessionId: ObjectId): Promise<void> {
  const db = await tryGetMongoDbWithin(MONGO_DEADLINE_MS);
  if (!db) return;
  await chunkCollection(db).deleteMany({ sessionId });
  await sessionCollection(db).deleteOne({ _id: sessionId });
}

export async function cancelChunkedUpload(input: {
  sessionId: string;
  ownerId: string;
}): Promise<void> {
  if (!ObjectId.isValid(input.sessionId)) return;
  const db = await tryGetMongoDbWithin(MONGO_DEADLINE_MS);
  if (!db) return;

  const session = await sessionCollection(db).findOne({
    _id: new ObjectId(input.sessionId),
  });
  if (!session || session.ownerId !== input.ownerId) return;
  await cleanupChunkedUpload(session._id);
}
