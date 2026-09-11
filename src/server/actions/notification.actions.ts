"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NotificationType as PrismaNotificationType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/prisma";
import { syncUser } from "@/server/realtime/sync";
import type { NotificationType } from "@/types/chat";
import { getDbVisibleNotificationTypes } from "@/lib/notification-db-types";

const notificationIdSchema = z.string().min(1);

function toDto(n: {
  id: string;
  type: PrismaNotificationType;
  title: string;
  body: string;
  payload: unknown;
  isRead: boolean;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: n.id,
    type: n.type as NotificationType,
    title: n.title,
    body: n.body,
    payload:
      n.payload && typeof n.payload === "object" && !Array.isArray(n.payload)
        ? (n.payload as Record<string, unknown>)
        : undefined,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(limit = 30): Promise<NotificationDTO[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const visibleTypes = await getDbVisibleNotificationTypes();
  if (visibleTypes.length === 0) return [];

  try {
    const docs = await prisma.notification.findMany({
      where: {
        recipientId: session.user.id,
        type: { in: visibleTypes },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return docs.map(toDto);
  } catch (err) {
    console.error("[getNotifications]", err);
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const visibleTypes = await getDbVisibleNotificationTypes();
  if (visibleTypes.length === 0) return 0;

  try {
    return await prisma.notification.count({
      where: {
        recipientId: session.user.id,
        isRead: false,
        type: { in: visibleTypes },
      },
    });
  } catch (err) {
    console.error("[getUnreadNotificationCount]", err);
    return 0;
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };

  const idParsed = notificationIdSchema.safeParse(notificationId);
  if (!idParsed.success) return { ok: false };

  const res = await prisma.notification.updateMany({
    where: {
      id: idParsed.data,
      recipientId: session.user.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  if (res.count === 0) return { ok: false };

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
  await syncUser(session.user.id, "notifications", {
    action: "read",
    delta: -1,
  });
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.updateMany({
    where: { recipientId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
  await syncUser(session.user.id, "notifications", { action: "read_all" });
}
