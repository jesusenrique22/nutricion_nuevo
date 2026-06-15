import { Db, ObjectId } from "mongodb";
import type { ConsultationCode } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { Collections } from "@/server/db/mongo";
import type { ConsultationChatCode, ConversationDoc } from "@/types/chat";
import { isConsultationChatCode } from "@/lib/consultation-chat";
import {
  resolvePatientDisplay,
  fetchPatientProfile,
} from "@/server/services/chat-patient-resolve";

export type ConsultationTypeRef = {
  id: string;
  code: ConsultationChatCode;
  name: string;
};

let typesCache: ConsultationTypeRef[] | null = null;
const preparedDbs = new WeakSet<Db>();

export async function getConsultationTypes(): Promise<ConsultationTypeRef[]> {
  if (typesCache) return typesCache;

  const rows = await prisma.consultationType.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  typesCache = rows.map((row) => ({
    id: row.id,
    code: row.code as ConsultationChatCode,
    name: row.name,
  }));

  return typesCache;
}

export async function resolveConsultationType(input: {
  code?: string | null;
  id?: string | null;
}): Promise<ConsultationTypeRef | null> {
  const types = await getConsultationTypes();

  if (input.id) {
    return types.find((t) => t.id === input.id) ?? null;
  }

  if (input.code && isConsultationChatCode(input.code)) {
    return types.find((t) => t.code === input.code) ?? null;
  }

  return null;
}

export async function validateAppointmentForChat(params: {
  appointmentId: string;
  patientId: string;
  consultationTypeId: string;
}): Promise<boolean> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.appointmentId,
      patientId: params.patientId,
      consultationTypeId: params.consultationTypeId,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    },
    select: { id: true },
  });

  return appointment !== null;
}

async function migrateLegacyConversations(db: Db): Promise<void> {
  const legacy = await db
    .collection<Partial<ConversationDoc>>(Collections.conversations)
    .find({ consultationTypeId: { $exists: false } })
    .toArray();

  if (legacy.length === 0) return;

  const defaultType = await resolveConsultationType({ code: "NUT_01" });
  if (!defaultType) {
    throw new Error("No se encontró ConsultationType NUT_01 en PostgreSQL");
  }

  await Promise.all(
    legacy.map((doc) =>
      db.collection(Collections.conversations).updateOne(
        { _id: doc._id },
        {
          $set: {
            consultationTypeId: defaultType.id,
            consultationCode: defaultType.code,
            appointmentId: doc.appointmentId ?? null,
          },
        },
      ),
    ),
  );
}

async function backfillConversationPatientIds(db: Db): Promise<void> {
  const convs = await db
    .collection<Partial<ConversationDoc>>(Collections.conversations)
    .find({})
    .toArray();

  await Promise.all(
    convs.map(async (doc) => {
      if (!doc._id || !doc.participants?.length) return;

      const resolved = await resolvePatientDisplay({
        patientId: doc.patientId ?? "",
        participants: doc.participants,
        patientName: doc.patientName,
        patientEmail: doc.patientEmail,
        appointmentId: doc.appointmentId,
      });

      const updates: Partial<ConversationDoc> = {};

      if (resolved.patientId && resolved.patientId !== doc.patientId) {
        updates.patientId = resolved.patientId;
      }
      if (
        resolved.patientName &&
        resolved.patientName !== doc.patientName &&
        !resolved.patientName.includes("(sin ficha)")
      ) {
        updates.patientName = resolved.patientName;
      }
      if (resolved.patientEmail && resolved.patientEmail !== doc.patientEmail) {
        updates.patientEmail = resolved.patientEmail;
      }

      if (Object.keys(updates).length === 0) return;

      return db
        .collection(Collections.conversations)
        .updateOne({ _id: doc._id }, { $set: updates });
    }),
  );
}

export async function syncConversationPatientProfile(
  db: Db,
  conv: ConversationDoc,
): Promise<ConversationDoc> {
  const resolved = await resolvePatientDisplay(conv);

  const updates: Partial<ConversationDoc> = {};

  if (resolved.patientId && resolved.patientId !== conv.patientId) {
    updates.patientId = resolved.patientId;
  }
  if (
    resolved.patientName &&
    resolved.patientName !== conv.patientName &&
    !resolved.patientName.includes("(sin ficha)")
  ) {
    updates.patientName = resolved.patientName;
  }
  if (resolved.patientEmail && resolved.patientEmail !== conv.patientEmail) {
    updates.patientEmail = resolved.patientEmail;
  }

  if (Object.keys(updates).length === 0 || !conv._id) {
    return { ...conv, ...updates };
  }

  await db
    .collection<ConversationDoc>(Collections.conversations)
    .updateOne({ _id: conv._id }, { $set: updates });

  return { ...conv, ...updates };
}

/** Migración legacy (índices en mongo.ts → ensureIndexes). */
export async function prepareChatStorage(db: Db): Promise<void> {
  if (preparedDbs.has(db)) return;
  await migrateLegacyConversations(db);
  await backfillConversationPatientIds(db);
  preparedDbs.add(db);
}

export async function findConversation(
  db: Db,
  params: {
    patientId: string;
    consultationTypeId: string;
  },
): Promise<ConversationDoc | null> {
  await prepareChatStorage(db);
  return db.collection<ConversationDoc>(Collections.conversations).findOne({
    patientId: params.patientId,
    consultationTypeId: params.consultationTypeId,
  });
}

export async function ensureConversation(
  db: Db,
  params: {
    patientId: string;
    adminId: string;
    consultationTypeId: string;
    consultationCode: ConsultationChatCode;
    appointmentId?: string | null;
  },
): Promise<ConversationDoc> {
  await prepareChatStorage(db);
  const col = db.collection<ConversationDoc>(Collections.conversations);

  let appointmentId: string | null = null;
  if (params.appointmentId) {
    const valid = await validateAppointmentForChat({
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      consultationTypeId: params.consultationTypeId,
    });
    if (valid) appointmentId = params.appointmentId;
  }

  const patient = await fetchPatientProfile(params.patientId);
  const patientName = patient?.name?.trim() || undefined;
  const patientEmail = patient?.email ?? undefined;

  const existing = await col.findOne({
    patientId: params.patientId,
    consultationTypeId: params.consultationTypeId,
  });

  if (existing) {
    const profileUpdates: Partial<ConversationDoc> = {};
    if (appointmentId && existing.appointmentId !== appointmentId) {
      profileUpdates.appointmentId = appointmentId;
    }
    if (patientName && existing.patientName !== patientName) {
      profileUpdates.patientName = patientName;
    }
    if (patientEmail && existing.patientEmail !== patientEmail) {
      profileUpdates.patientEmail = patientEmail;
    }

    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updatedAt = new Date();
      await col.updateOne({ _id: existing._id }, { $set: profileUpdates });
      Object.assign(existing, profileUpdates);
    }

    return existing;
  }

  const now = new Date();
  const doc: ConversationDoc = {
    participants: [params.adminId, params.patientId],
    patientId: params.patientId,
    patientName,
    patientEmail,
    consultationTypeId: params.consultationTypeId,
    consultationCode: params.consultationCode,
    appointmentId,
    unreadCount: { [params.adminId]: 0, [params.patientId]: 0 },
    createdAt: now,
    updatedAt: now,
  };

  try {
    const res = await col.insertOne(doc);
    const created = await col.findOne({ _id: res.insertedId });
    if (!created) throw new Error("No se pudo crear la conversación");
    return created;
  } catch {
    const raced = await col.findOne({
      patientId: params.patientId,
      consultationTypeId: params.consultationTypeId,
    });
    if (raced) return raced;
    throw new Error("No se pudo crear la conversación");
  }
}

export async function findConversationById(
  db: Db,
  conversationId: string,
): Promise<ConversationDoc | null> {
  await prepareChatStorage(db);
  if (!ObjectId.isValid(conversationId)) return null;
  return db
    .collection<ConversationDoc>(Collections.conversations)
    .findOne({ _id: new ObjectId(conversationId) });
}

export function mapPrismaConsultationCode(
  code: ConsultationCode,
): ConsultationChatCode {
  return code as ConsultationChatCode;
}
