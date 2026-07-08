/**
 * Servicio interno de notificaciones (PostgreSQL / Neon).
 * NO usar "use server" — no debe ser invocable desde el cliente.
 */
import type {
  NotificationType as PrismaNotificationType,
  Prisma,
} from "@prisma/client";
import { syncUser } from "@/server/realtime/sync";
import { prisma } from "@/server/db/prisma";
import type { NotificationType } from "@/types/chat";

export async function createNotification(params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.notification.create({
    data: {
      recipientId: params.recipientId,
      type: params.type as PrismaNotificationType,
      title: params.title,
      body: params.body,
      payload: params.payload
        ? (params.payload as Prisma.InputJsonValue)
        : undefined,
    },
  });

  await syncUser(params.recipientId, "notifications", {
    type: params.type,
    action: "created",
  });
}
