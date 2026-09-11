import { NotificationType as PrismaNotificationType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { VISIBLE_NOTIFICATION_TYPES } from "@/types/chat";

const prismaNotificationTypes = new Set(
  Object.values(PrismaNotificationType),
);

const clientVisibleTypes = VISIBLE_NOTIFICATION_TYPES.filter((t) =>
  prismaNotificationTypes.has(t as PrismaNotificationType),
) as PrismaNotificationType[];

function isPgEnumValueError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("22P02") ||
    msg.includes('invalid input value for enum "NotificationType"')
  );
}

let cachedDbVisibleTypes: PrismaNotificationType[] | null = null;

/**
 * Tipos visibles que Postgres acepta en el enum (puede faltar migrate deploy).
 */
export async function getDbVisibleNotificationTypes(): Promise<
  PrismaNotificationType[]
> {
  if (cachedDbVisibleTypes) return cachedDbVisibleTypes;

  const withoutPending = clientVisibleTypes.filter(
    (t) => t !== PrismaNotificationType.PAYMENT_DUE_REMINDER,
  );

  for (const types of [clientVisibleTypes, withoutPending]) {
    if (types.length === 0) continue;
    try {
      await prisma.notification.findFirst({
        where: { type: { in: types } },
        select: { id: true },
      });
      cachedDbVisibleTypes = types;
      return types;
    } catch (err) {
      if (!isPgEnumValueError(err)) throw err;
    }
  }

  cachedDbVisibleTypes = withoutPending;
  return withoutPending;
}

/** Invalida caché tras migrate deploy (dev hot reload). */
export function resetNotificationTypeCache(): void {
  cachedDbVisibleTypes = null;
}
