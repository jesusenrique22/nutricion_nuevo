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

/** Valores agregados al enum después del release inicial, del más nuevo al más viejo. */
const RECENT_ENUM_VALUES: string[] = [
  "PURCHASE_STATUS",
  "NEW_PATIENT_REGISTERED",
  "PAYMENT_DUE_REMINDER",
];

function without(
  types: PrismaNotificationType[],
  excluded: string[],
): PrismaNotificationType[] {
  return types.filter((t) => !excluded.includes(t));
}

/**
 * Tipos visibles que Postgres acepta en el enum (puede faltar migrate deploy).
 */
export async function getDbVisibleNotificationTypes(): Promise<
  PrismaNotificationType[]
> {
  if (cachedDbVisibleTypes) return cachedDbVisibleTypes;

  // Cada intento descarta un valor más de los agregados recientemente.
  const attempts: PrismaNotificationType[][] = [clientVisibleTypes];
  for (let i = 1; i <= RECENT_ENUM_VALUES.length; i++) {
    attempts.push(without(clientVisibleTypes, RECENT_ENUM_VALUES.slice(0, i)));
  }

  for (const types of attempts) {
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

  const safest = without(clientVisibleTypes, RECENT_ENUM_VALUES);
  cachedDbVisibleTypes = safest;
  return safest;
}

/** Invalida caché tras migrate deploy (dev hot reload). */
export function resetNotificationTypeCache(): void {
  cachedDbVisibleTypes = null;
}
