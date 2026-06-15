"use server";

import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { consultationChatLabel } from "@/lib/consultation-chat";
import { prisma } from "@/server/db/prisma";
import { getMongoDb, Collections } from "@/server/db/mongo";
import type {
  ConsultationChatCode,
  ConversationDoc,
  MessageDoc,
  MessageType,
  AttachmentMeta,
} from "@/types/chat";
import { createNotification } from "@/server/actions/notification.actions";
import { emitSocketEvent } from "@/server/realtime/emit";
import { syncUser } from "@/server/realtime/sync";
import { assertConversationAccess } from "@/server/services/chat-access";
import {
  ensureConversation,
  getConsultationTypes,
  prepareChatStorage,
  resolveConsultationType,
} from "@/server/services/chat-conversation.service";
import {
  getCachedPatientChatEligibility,
  getPatientChatEligibility,
  isPatientChatEnabled,
} from "@/server/services/chat-eligibility.service";
import { getChatSticker } from "@/lib/chat-stickers";
import type { ChatUnlockReason } from "@/types/payment-chat-policy";

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

export interface ChatFileDTO {
  id: string;
  messageId: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  type: MessageType;
  createdAt: string;
  senderId: string;
  senderName: string;
  isMine: boolean;
}

function serializeChatFile(
  doc: MessageDoc & { _id?: ObjectId },
  currentUserId: string,
  senderNames: Record<string, string>,
): ChatFileDTO | null {
  if (!doc.attachment || !doc._id) return null;
  return {
    id: doc._id.toString(),
    messageId: doc._id.toString(),
    fileName: doc.attachment.fileName,
    url: doc.attachment.url,
    mimeType: doc.attachment.mimeType,
    sizeBytes: doc.attachment.sizeBytes,
    type: doc.type,
    createdAt: doc.createdAt.toISOString(),
    senderId: doc.senderId,
    senderName: senderNames[doc.senderId] ?? "Usuario",
    isMine: doc.senderId === currentUserId,
  };
}

export interface ConversationListItem {
  id: string;
  patientId: string;
  patientName: string;
  consultationCode: ConsultationChatCode;
  consultationLabel: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
}

export interface PatientChatTab {
  consultationCode: ConsultationChatCode;
  consultationLabel: string;
  conversationId: string | null;
  unread: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  enabled: boolean;
  unlockHint: string;
}

export interface ChatPageData {
  conversationId: string;
  messages: MessageDTO[];
  otherUserName: string;
  otherUserId: string;
  currentUserId: string;
  role: "ADMIN" | "PATIENT";
  consultationCode: ConsultationChatCode;
  consultationLabel: string;
  patientChatTabs?: PatientChatTab[];
  chatEnabled: boolean;
  unlockHint?: string;
  unlockReason?: ChatUnlockReason;
}

function serializeConversationListItem(
  conv: ConversationDoc,
  nameMap: Record<string, string>,
  currentUserId: string,
): ConversationListItem {
  return {
    id: conv._id!.toString(),
    patientId: conv.patientId,
    patientName: nameMap[conv.patientId] ?? "Paciente",
    consultationCode: conv.consultationCode,
    consultationLabel: consultationChatLabel(conv.consultationCode),
    lastMessage: conv.lastMessage?.text ?? null,
    lastMessageAt: conv.lastMessage?.createdAt.toISOString() ?? null,
    unread: conv.unreadCount[currentUserId] ?? 0,
  };
}

function chatDeepLink(params: {
  role: "ADMIN" | "PATIENT";
  conversationId: string;
  consultationCode: ConsultationChatCode;
}) {
  if (params.role === "ADMIN") {
    return `/dashboard/chat?conversation=${params.conversationId}`;
  }
  return `/dashboard/chat?type=${params.consultationCode}`;
}

/** Lista de conversaciones para la doctora (una fila por paciente + tipo). */
export async function getAdminConversations(): Promise<ConversationListItem[]> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return [];

  const db = await getMongoDb();
  await prepareChatStorage(db);

  const convs = await db
    .collection<ConversationDoc>(Collections.conversations)
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  if (convs.length === 0) return [];

  const patientIds = [...new Set(convs.map((c) => c.patientId))];
  const patients = await prisma.user.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, name: true },
  });
  const nameMap = Object.fromEntries(patients.map((p) => [p.id, p.name]));

  return convs.map((c) =>
    serializeConversationListItem(c, nameMap, session.user!.id),
  );
}

/** Resumen de los 3 chats del paciente (pestañas). */
export async function getPatientChatTabs(): Promise<PatientChatTab[]> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PATIENT") return [];

  const db = await getMongoDb();
  await prepareChatStorage(db);

  const [types, eligibility] = await Promise.all([
    getConsultationTypes(),
    getPatientChatEligibility(session.user.id),
  ]);

  const existing = await db
    .collection<ConversationDoc>(Collections.conversations)
    .find({ patientId: session.user.id })
    .toArray();
  const byTypeId = new Map(
    existing.map((c) => [c.consultationTypeId, c] as const),
  );

  return types.map((type) => {
    const conv = byTypeId.get(type.id);
    const access = eligibility[type.code];
    return {
      consultationCode: type.code,
      consultationLabel: consultationChatLabel(type.code),
      conversationId: conv?._id?.toString() ?? null,
      unread: access.enabled ? (conv?.unreadCount[session.user!.id] ?? 0) : 0,
      lastMessage: conv?.lastMessage?.text ?? null,
      lastMessageAt: conv?.lastMessage?.createdAt.toISOString() ?? null,
      enabled: access.enabled,
      unlockHint: access.unlockHint,
    };
  });
}

/** Total de mensajes de chat sin leer para el usuario actual. */
export async function getUnreadChatCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  try {
    const db = await getMongoDb();
    const convs = await db
      .collection<ConversationDoc>(Collections.conversations)
      .find(
        { participants: session.user.id },
        { projection: { consultationCode: 1, unreadCount: 1 } },
      )
      .toArray();

    if (session.user.role === "PATIENT") {
      const eligibility = await getCachedPatientChatEligibility(session.user.id);
      return convs.reduce((sum, c) => {
        if (!eligibility[c.consultationCode]?.enabled) return sum;
        return sum + (c.unreadCount[session.user!.id] ?? 0);
      }, 0);
    }

    return convs.reduce(
      (sum, c) => sum + (c.unreadCount[session.user!.id] ?? 0),
      0,
    );
  } catch {
    return 0;
  }
}

/** Datos iniciales del chat para paciente o doctora. */
export async function getChatPageData(options?: {
  selectedConversationId?: string;
  consultationCode?: string;
  appointmentId?: string;
}): Promise<ChatPageData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const db = await getMongoDb();
  await prepareChatStorage(db);
  const conversations = db.collection<ConversationDoc>(Collections.conversations);
  const messagesCol = db.collection<MessageDoc>(Collections.messages);

  let conversation: ConversationDoc | null = null;
  let chatEnabled = true;
  let unlockHint: string | undefined;
  let unlockReason: ChatUnlockReason | undefined;

  if (session.user.role === "PATIENT") {
    const adminId = await getPrimaryAdminId();
    if (!adminId) return null;

    const type =
      (await resolveConsultationType({
        code: options?.consultationCode ?? "NUT_01",
      })) ?? (await resolveConsultationType({ code: "NUT_01" }));
    if (!type) return null;

    const access = await isPatientChatEnabled(session.user.id, type.code);
    chatEnabled = access.enabled;
    unlockHint = access.unlockHint;
    unlockReason = access.reason;

    if (chatEnabled) {
      conversation = await ensureConversation(db, {
        patientId: session.user.id,
        adminId,
        consultationTypeId: type.id,
        consultationCode: type.code,
        appointmentId: options?.appointmentId,
      });
    }
  } else {
    if (!options?.selectedConversationId) return null;
    conversation = await assertConversationAccess(
      options.selectedConversationId,
      session.user.id,
      session.user.role,
    );
  }

  if (!conversation?._id && session.user.role !== "PATIENT") return null;

  const resolvedType =
    session.user.role === "PATIENT"
      ? ((await resolveConsultationType({
          code: options?.consultationCode ?? "NUT_01",
        })) ?? (await resolveConsultationType({ code: "NUT_01" })))
      : null;

  if (session.user.role === "PATIENT" && !resolvedType) return null;

  const convId = conversation?._id?.toString() ?? "";
  const otherUserId =
    conversation?.participants.find((id) => id !== session.user!.id) ??
    (await getPrimaryAdminId());
  if (!otherUserId) return null;

  const [otherUser, patientTabs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: { name: true },
    }),
    session.user.role === "PATIENT" ? getPatientChatTabs() : Promise.resolve(undefined),
  ]);

  let rawMessages: (MessageDoc & { _id?: ObjectId })[] = [];
  if (conversation?._id && chatEnabled) {
    rawMessages = await messagesCol
      .find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(MAX_MESSAGES)
      .toArray();

    await conversations.updateOne(
      { _id: conversation._id },
      { $set: { [`unreadCount.${session.user.id}`]: 0 } },
    );
  }

  const consultationCode =
    conversation?.consultationCode ??
    resolvedType!.code;

  return {
    conversationId: convId,
    messages: rawMessages
      .reverse()
      .map((m) => serializeMessage(m, session.user!.id)),
    otherUserName: otherUser?.name ?? "Usuario",
    otherUserId,
    currentUserId: session.user.id,
    role: session.user.role,
    consultationCode,
    consultationLabel: consultationChatLabel(consultationCode),
    patientChatTabs: patientTabs,
    chatEnabled,
    unlockHint,
    unlockReason,
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

  if (session.user.role === "PATIENT") {
    const access = await isPatientChatEnabled(
      session.user.id,
      conv.consultationCode,
    );
    if (!access.enabled) {
      return { ok: false, message: access.unlockHint };
    }
  }

  if (params.type === "TEXT" && !params.text?.trim()) {
    return { ok: false, message: "El mensaje no puede estar vacío" };
  }

  const db = await getMongoDb();
  await prepareChatStorage(db);
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
    (attachment ? `[${attachment.fileName}]` : "[archivo]");

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

  const deepLink = chatDeepLink({
    role: session.user.role,
    conversationId: params.conversationId,
    consultationCode: conv.consultationCode,
  });

  await createNotification({ _serverOnly: true,
    recipientId,
    type: "NEW_MESSAGE",
    title: `Nuevo mensaje · ${consultationChatLabel(conv.consultationCode)}`,
    body: `${sender?.name ?? "Alguien"}: ${previewText.slice(0, 80)}`,
    payload: {
      conversationId: params.conversationId,
      consultationCode: conv.consultationCode,
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
      consultationCode: conv.consultationCode,
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
    message: serializeMessage({ ...doc, _id: res.insertedId }, session.user.id),
  };
}

/** Envía un sticker del brandbook (sin subir archivo). */
export async function sendChatSticker(params: {
  conversationId: string;
  stickerId: string;
}): Promise<
  { ok: true; message: MessageDTO } | { ok: false; message: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "No autorizado" };
  }

  const sticker = getChatSticker(params.stickerId);
  if (!sticker) {
    return { ok: false, message: "Sticker no encontrado" };
  }

  const conv = await assertConversationAccess(
    params.conversationId,
    session.user.id,
    session.user.role,
  );
  if (!conv) return { ok: false, message: "Conversación no encontrada" };

  if (session.user.role === "PATIENT") {
    const access = await isPatientChatEnabled(
      session.user.id,
      conv.consultationCode,
    );
    if (!access.enabled) {
      return { ok: false, message: access.unlockHint };
    }
  }

  const db = await getMongoDb();
  await prepareChatStorage(db);
  const messages = db.collection<MessageDoc>(Collections.messages);
  const conversations = db.collection<ConversationDoc>(Collections.conversations);

  const now = new Date();
  const convId = new ObjectId(params.conversationId);
  const previewText = `[${sticker.label}]`;

  const attachment: AttachmentMeta = {
    fileId: new ObjectId(),
    url: sticker.src,
    mimeType: "image/svg+xml",
    fileName: `${sticker.label}.svg`,
    sizeBytes: 0,
  };

  const doc: MessageDoc = {
    conversationId: convId,
    senderId: session.user.id,
    type: "STICKER",
    text: null,
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

  const deepLink = chatDeepLink({
    role: session.user.role,
    conversationId: params.conversationId,
    consultationCode: conv.consultationCode,
  });

  await createNotification({ _serverOnly: true,
    recipientId,
    type: "NEW_MESSAGE",
    title: `Nuevo sticker · ${consultationChatLabel(conv.consultationCode)}`,
    body: `${sender?.name ?? "Alguien"} envió un sticker`,
    payload: {
      conversationId: params.conversationId,
      consultationCode: conv.consultationCode,
      deepLink,
    },
  });

  await emitSocketEvent({
    userIds: [recipientId],
    event: "message:incoming",
    data: {
      senderName: sender?.name ?? "Alguien",
      preview: previewText,
      deepLink,
      conversationId: params.conversationId,
      consultationCode: conv.consultationCode,
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
    message: serializeMessage({ ...doc, _id: res.insertedId }, session.user.id),
  };
}

/** Archivos compartidos en una conversación (imágenes, PDFs, videos, etc.). */
export async function getConversationFiles(
  conversationId: string,
): Promise<ChatFileDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const conv = await assertConversationAccess(
    conversationId,
    session.user.id,
    session.user.role,
  );
  if (!conv) return [];

  const db = await getMongoDb();
  const docs = await db
    .collection<MessageDoc>(Collections.messages)
    .find({
      conversationId: new ObjectId(conversationId),
      attachment: { $exists: true, $ne: null },
      type: { $ne: "STICKER" },
    })
    .sort({ createdAt: -1 })
    .toArray();

  const senderIds = [...new Set(docs.map((d) => d.senderId))];
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true },
  });
  const senderNames = Object.fromEntries(
    senders.map((s) => [s.id, s.name] as const),
  );

  return docs
    .map((d) => serializeChatFile(d, session.user!.id, senderNames))
    .filter((f): f is ChatFileDTO => f !== null);
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

  return docs.reverse().map((m) => serializeMessage(m, session.user!.id));
}

/** Abre o crea el chat admin para un paciente y tipo de consulta. */
export async function getAdminChatForPatient(params: {
  patientId: string;
  consultationCode: string;
}): Promise<{ conversationId: string } | null> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;

  const type = await resolveConsultationType({ code: params.consultationCode });
  if (!type) return null;

  const patient = await prisma.user.findFirst({
    where: { id: params.patientId, role: "PATIENT" },
    select: { id: true },
  });
  if (!patient) return null;

  const db = await getMongoDb();
  const conversation = await ensureConversation(db, {
    patientId: patient.id,
    adminId: session.user.id,
    consultationTypeId: type.id,
    consultationCode: type.code,
  });

  return { conversationId: conversation._id!.toString() };
}
