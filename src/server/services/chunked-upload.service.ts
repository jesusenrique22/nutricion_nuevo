import { ObjectId } from "mongodb";
import { tryGetMongoDb } from "@/server/db/mongo";
import type { UploadKind } from "@/lib/upload-policy";
import { validateUploadBuffer } from "@/lib/upload-policy";
import {
  storePublicBuffer,
  type StoredFile,
} from "@/server/services/file-storage";

const SESSIONS = "upload_sessions";
const CHUNKS = "upload_chunks";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

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

function chunkCollection(db: Awaited<ReturnType<typeof tryGetMongoDb>>) {
  if (!db) throw new Error("MongoDB no disponible para subidas grandes.");
  return db.collection<{ sessionId: ObjectId; chunkIndex: number; data: Buffer }>(
    CHUNKS,
  );
}

function sessionCollection(db: Awaited<ReturnType<typeof tryGetMongoDb>>) {
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
  const db = await tryGetMongoDb();
  if (!db) {
    throw new Error(
      "No pudimos iniciar la subida. Verificá que MongoDB Atlas esté activo y accesible (Network Access → 0.0.0.0/0 para Vercel).",
    );
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

  const db = await tryGetMongoDb();
  if (!db) {
    throw new Error("MongoDB no disponible. Intentá de nuevo en unos minutos.");
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

  const db = await tryGetMongoDb();
  if (!db) {
    throw new Error("MongoDB no disponible. Intentá de nuevo en unos minutos.");
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

  const buffer = Buffer.concat(parts.map((part) => part.data));
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
  const db = await tryGetMongoDb();
  if (!db) return;
  await chunkCollection(db).deleteMany({ sessionId });
  await sessionCollection(db).deleteOne({ _id: sessionId });
}

export async function cancelChunkedUpload(input: {
  sessionId: string;
  ownerId: string;
}): Promise<void> {
  if (!ObjectId.isValid(input.sessionId)) return;
  const db = await tryGetMongoDb();
  if (!db) return;

  const session = await sessionCollection(db).findOne({
    _id: new ObjectId(input.sessionId),
  });
  if (!session || session.ownerId !== input.ownerId) return;
  await cleanupChunkedUpload(session._id);
}
