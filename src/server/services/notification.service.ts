/**
 * Servicio interno de notificaciones (MongoDB).
 * NO usar "use server" — no debe ser invocable desde el cliente.
 */
import { getMongoDb, Collections } from "@/server/db/mongo";
import { syncUser } from "@/server/realtime/sync";
import type { NotificationDoc, NotificationType } from "@/types/chat";

export async function createNotification(params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
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
