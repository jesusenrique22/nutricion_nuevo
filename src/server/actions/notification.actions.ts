"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getMongoDb, Collections } from "@/server/db/mongo";
import { syncUser } from "@/server/realtime/sync";
import type { NotificationDoc, NotificationType } from "@/types/chat";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

/**
 * Internal server-only function. NOT a Server Action callable from the client.
 * Import only from server-side services/actions.
 */
export async function createNotification(params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  /** Must be true to confirm the call is from internal server code. */
  _serverOnly?: true;
}) {
  const db = await getMongoDb();
  await db.collection<NotificationDoc>(Collections.notifications).insertOne({
    recipientId: params.recipientId,
    type: params.type,
    title: params.title,
    body: params.body,
    payload: params.payload,
    isRead: false,
    createdAt: new Date(),
  });

  await syncUser(params.recipientId, "notifications", {
    type: params.type,
    action: "created",
  });
}

export async function getNotifications(limit = 30): Promise<NotificationDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = await getMongoDb();
  const docs = await db
    .collection<NotificationDoc>(Collections.notifications)
    .find({ recipientId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((n) => ({
    id: n._id!.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    payload: n.payload,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  try {
    const db = await getMongoDb();
    return await db
      .collection<NotificationDoc>(Collections.notifications)
      .countDocuments({ recipientId: session.user.id, isRead: false });
  } catch {
    return 0;
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };

  const db = await getMongoDb();
  const res = await db
    .collection<NotificationDoc>(Collections.notifications)
    .updateOne(
      {
        _id: new ObjectId(notificationId),
        recipientId: session.user.id,
      },
      { $set: { isRead: true } },
    );

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
  await syncUser(session.user.id, "notifications", {
    action: "read",
    delta: -1,
  });
  return { ok: res.modifiedCount > 0 };
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const db = await getMongoDb();
  await db
    .collection<NotificationDoc>(Collections.notifications)
    .updateMany(
      { recipientId: session.user.id, isRead: false },
      { $set: { isRead: true } },
    );
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
  await syncUser(session.user.id, "notifications", { action: "read_all" });
}
