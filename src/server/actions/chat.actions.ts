"use server";

import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getMongoDb, Collections } from "@/server/db/mongo";
import type { ConversationDoc, MessageDoc, MessageType } from "@/types/chat";

/** Obtiene (o crea) la conversación entre paciente y nutricionista. */
export async function getOrCreateConversation(params: {
  patientId: string;
  adminId: string;
}): Promise<string> {
  const db = await getMongoDb();
  const col = db.collection<ConversationDoc>(Collections.conversations);

  const existing = await col.findOne({ patientId: params.patientId });
  if (existing?._id) return existing._id.toString();

  const now = new Date();
  const res = await col.insertOne({
    participants: [params.adminId, params.patientId],
    patientId: params.patientId,
    unreadCount: { [params.adminId]: 0, [params.patientId]: 0 },
    createdAt: now,
    updatedAt: now,
  });
  return res.insertedId.toString();
}

/** Persiste un mensaje en MongoDB y actualiza el resumen de la conversación. */
export async function sendMessage(params: {
  conversationId: string;
  type: MessageType;
  text?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, message: "No autorizado" };

  const db = await getMongoDb();
  const messages = db.collection<MessageDoc>(Collections.messages);
  const conversations = db.collection<ConversationDoc>(
    Collections.conversations,
  );

  const now = new Date();
  const convId = new ObjectId(params.conversationId);

  const doc: MessageDoc = {
    conversationId: convId,
    senderId: session.user.id,
    type: params.type,
    text: params.text ?? null,
    readBy: [session.user.id],
    createdAt: now,
  };
  const res = await messages.insertOne(doc);

  await conversations.updateOne(
    { _id: convId },
    {
      $set: {
        lastMessage: {
          text: params.text ?? "[archivo]",
          senderId: session.user.id,
          createdAt: now,
        },
        updatedAt: now,
      },
    },
  );

  return { ok: true as const, messageId: res.insertedId.toString() };
}

/** Lee el historial de mensajes (paginado simple). */
export async function getMessages(conversationId: string, limit = 50) {
  const db = await getMongoDb();
  const messages = db.collection<MessageDoc>(Collections.messages);
  const docs = await messages
    .find({ conversationId: new ObjectId(conversationId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.reverse();
}
