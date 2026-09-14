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

/**
 * Si el enum de Postgres todavía no tiene el valor (deploy sin `migrate deploy`),
 * se reintenta con un tipo antiguo equivalente en vez de perder la notificación.
 */
const ENUM_FALLBACK: Partial<Record<NotificationType, NotificationType>> = {
  PURCHASE_STATUS: "RESOURCE_UNLOCKED",
  NEW_PATIENT_REGISTERED: "APPOINTMENT_REMINDER",
};

function isMissingEnumValueError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("22P02") ||
    msg.includes('invalid input value for enum "NotificationType"')
  );
}

export async function createNotification(params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}) {
  const data = {
    recipientId: params.recipientId,
    title: params.title,
    body: params.body,
    payload: params.payload
      ? (params.payload as Prisma.InputJsonValue)
      : undefined,
  };

  try {
    await prisma.notification.create({
      data: { ...data, type: params.type as PrismaNotificationType },
    });
  } catch (err) {
    const fallback = ENUM_FALLBACK[params.type];
    if (!fallback || !isMissingEnumValueError(err)) throw err;
    await prisma.notification.create({
      data: { ...data, type: fallback as PrismaNotificationType },
    });
  }

  await syncUser(params.recipientId, "notifications", {
    type: params.type,
    action: "created",
  });
}
