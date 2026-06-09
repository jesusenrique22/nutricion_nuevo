"use server";

import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { getMongoDb, Collections } from "@/server/db/mongo";
import type {
  ConversationDoc,
  MessageDoc,
  MessageType,
  AttachmentMeta,
} from "@/types/chat";
import { createNotification } from "@/server/actions/notification.actions";
import { emitSocketEvent } from "@/server/realtime/emit";
import { syncUser } from "@/server/realtime/sync";
import { assertConversationAccess } from "@/server/services/chat-access";

const MAX_MESSAGES = 100;

async function getPrimaryAdminId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  return admin?.id ?? null;
}

function serializeMessage(
  doc: MessageDoc & { _id?: ObjectId },
  currentUserId: string,
) {
  return {
    id: doc._id!.toString(),
    senderId: doc.senderId,
    type: doc.type,
    text: doc.text,
    attachment: doc.attachment
      ? {
          url: doc.attachment.url,
          mimeType: doc.attachment.mimeType,
          fileName: doc.attachment.fileName,
          sizeBytes: doc.attachment.sizeBytes,
        }
      : null,
    createdAt: doc.createdAt.toISOString(),
    isMine: doc.senderId === currentUserId,
  };
}

export type MessageDTO = ReturnType<typeof serializeMessage>;

export interface ConversationListItem {
  id: string;
  patientId: string;
  patientName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
}

export interface ChatPageData {
  conversationId: string;
  messages: MessageDTO[];
  otherUserName: string;
  otherUserId: string;
  currentUserId: string;
  role: "ADMIN" | "PATIENT";
}

/** Lista de conversaciones para la doctora. */
export async function getAdminConversations(): Promise<ConversationListItem[]> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return [];

  const db = await getMongoDb();
  const convs = await db
    .collection<ConversationDoc>(Collections.conversations)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  if (convs.length === 0) return [];

  const patientIds = convs.map((c) => c.patientId);
  const patients = await prisma.user.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true },
  });
  const nameMap = Object.fromEntries(patients.map((p) => [p.id, p.name]));

  return convs.map((c) => ({
    id: c._id!.toString(),
    patientId: c.patientId,
    patientName: nameMap[c.patientId] ?? "Paciente",
    lastMessage: c.lastMessage?.text ?? null,
    lastMessageAt: c.lastMessage?.createdAt.toISOString() ?? null,
    unread: c.unreadCount[session.user.id] ?? 0,
  }));
}

/** Total de mensajes de chat sin leer para el usuario actual. */
export async function getUnreadChatCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  try {
    const db = await getMongoDb();
    const convs = await db
      .collection<ConversationDoc>(Collections.conversations)
      .find({ participants: session.user.id })
      .toArray();

    return convs.reduce(
      (sum, c) => sum + (c.unreadCount[session.user!.id] ?? 0),
      0,
    );
  } catch {
    return 0;
  }
}

/** Datos iniciales del chat para paciente o doctora. */
export async function getChatPageData(
  selectedConversationId?: string,
): Promise<ChatPageData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = await getMongoDb();
  const conversations = db.collection<ConversationDoc>(Collections.conversations);
  const messagesCol = db.collection<MessageDoc>(Collections.messages);

  let conversation: ConversationDoc | null = null;

  if (session.user.role === "PATIENT") {
    const adminId = await getPrimaryAdminId();
    if (!adminId) return null;

    conversation = await conversations.findOne({ patientId: session.user.id });
    if (!conversation) {
      const now = new Date();
      const res = await conversations.insertOne({
        participants: [adminId, session.user.id],
        patientId: session.user.id,
        unreadCount: { [adminId]: 0, [session.user.id]: 0 },
        createdAt: now,
        updatedAt: now,
      });
      conversation = await conversations.findOne({ _id: res.insertedId });
    }
  } else {
    if (!selectedConversationId) return null;
    conversation = await assertConversationAccess(
      selectedConversationId,
      session.user.id,
      session.user.role,
    );
  }

  if (!conversation?._id) return null;

  const convId = conversation._id.toString();
  const otherUserId = conversation.participants.find(
    (id) => id !== session.user!.id,
  )!;

  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { name: true },
  });

  const rawMessages = await messagesCol
    .find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(MAX_MESSAGES)
    .toArray();

  // Marcar como leído al abrir
  await conversations.updateOne(
    { _id: conversation._id },
    { $set: { [`unreadCount.${session.user.id}`]: 0 } },
  );

  return {
    conversationId: convId,
    messages: rawMessages
      .reverse()
      .map((m) => serializeMessage(m, session.user!.id)),
    otherUserName: otherUser?.name ?? "Usuario",
    otherUserId,
    currentUserId: session.user.id,
    role: session.user.role,
  };
}

/** Envía mensaje de texto o con adjunto ya subido. */
export async function sendChatMessage(params: {
  conversationId: string;
  type: MessageType;
  text?: string;
  attachment?: {
    fileId: string;
    url: string;
    mimeType: string;
    fileName: string;
    sizeBytes: number;
  };
}): Promise<
  { ok: true; message: MessageDTO } | { ok: false; message: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "No autorizado" };
  }

  const conv = await assertConversationAccess(
    params.conversationId,
    session.user.id,
    session.user.role,
  );
  if (!conv) return { ok: false, message: "Conversación no encontrada" };

  if (params.type === "TEXT" && !params.text?.trim()) {
    return { ok: false, message: "El mensaje no puede estar vacío" };
  }

  const db = await getMongoDb();
  const messages = db.collection<MessageDoc>(Collections.messages);
  const conversations = db.collection<ConversationDoc>(Collections.conversations);

  const now = new Date();
  const convId = new ObjectId(params.conversationId);

  let attachment: AttachmentMeta | null = null;
  if (params.attachment) {
    attachment = {
      fileId: new ObjectId(params.attachment.fileId),
      url: params.attachment.url,
      mimeType: params.attachment.mimeType,
      fileName: params.attachment.fileName,
      sizeBytes: params.attachment.sizeBytes,
    };
  }

  const previewText =
    params.text?.trim() ||
    (attachment
      ? `[${attachment.fileName}]`
      : "[archivo]");

  const doc: MessageDoc = {
    conversationId: convId,
    senderId: session.user.id,
    type: params.type,
    text: params.text?.trim() ?? null,
    attachment,
    readBy: [session.user.id],
    createdAt: now,
  };

  const res = await messages.insertOne(doc);

  const recipientId = conv.participants.find((id) => id !== session.user!.id)!;

  await conversations.updateOne(
    { _id: convId },
    {
      $set: {
        lastMessage: {
          text: previewText,
          senderId: session.user.id,
          createdAt: now,
        },
        updatedAt: now,
      },
      $inc: { [`unreadCount.${recipientId}`]: 1 },
    },
  );

  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  const deepLink =
    session.user.role === "ADMIN"
      ? `/dashboard/chat?conversation=${params.conversationId}`
      : "/dashboard/chat";

  await createNotification({
    recipientId,
    type: "NEW_MESSAGE",
    title: "Nuevo mensaje",
    body: `${sender?.name ?? "Alguien"}: ${previewText.slice(0, 80)}`,
    payload: {
      conversationId: params.conversationId,
      deepLink,
    },
  });

  await emitSocketEvent({
    userIds: [recipientId],
    event: "message:incoming",
    data: {
      senderName: sender?.name ?? "Alguien",
      preview: previewText.slice(0, 80),
      deepLink,
      conversationId: params.conversationId,
    },
  });

  await Promise.all([
    syncUser(session.user.id, "chat", {
      conversationId: params.conversationId,
    }),
    syncUser(recipientId, "chat", {
      conversationId: params.conversationId,
    }),
  ]);

  return {
    ok: true,
    message: serializeMessage(
      { ...doc, _id: res.insertedId },
      session.user.id,
    ),
  };
}

/** Historial adicional (paginación por cursor). */
export async function getMessages(
  conversationId: string,
  before?: string,
  limit = 50,
): Promise<MessageDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const conv = await assertConversationAccess(
    conversationId,
    session.user.id,
    session.user.role,
  );
  if (!conv) return [];

  const db = await getMongoDb();
  const filter: Record<string, unknown> = {
    conversationId: new ObjectId(conversationId),
  };
  if (before) {
    filter._id = { $lt: new ObjectId(before) };
  }

  const docs = await db
    .collection<MessageDoc>(Collections.messages)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs
    .reverse()
    .map((m) => serializeMessage(m, session.user!.id));
}
