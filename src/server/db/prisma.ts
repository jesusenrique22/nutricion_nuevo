import { statSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient as PrismaClientCtor } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { ensureDatabaseEnv } from "@/lib/database-url";
import { createNeonPrismaClientOptions } from "@/server/db/neon-prisma-factory";

// Debe ejecutarse antes de instanciar PrismaClient para que Neon reciba
// connection_limit y pool_timeout en la URL (evita pool timeout en dev).
ensureDatabaseEnv();

const REQUIRED_DELEGATES = [
  "user",
  "cartItem",
  "productPurchase",
  "notification",
] as const;

/** Modelos nuevos: no bloquean el arranque si Turbopack aún tiene un bundle viejo. */
const OPTIONAL_DELEGATES = [
  "review",
  "coupon",
  "recurringBlockedWeekday",
  "internalEvent",
] as const;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaMtime?: number;
};

function schemaMtimeMs(): number {
  try {
    return statSync(path.join(process.cwd(), "prisma/schema.prisma")).mtimeMs;
  } catch {
    return 0;
  }
}

function hasRequiredDelegates(client: PrismaClient): boolean {
  return REQUIRED_DELEGATES.every((key) => key in client);
}

export function prismaHasDelegate(name: string): boolean {
  try {
    const client = getPrismaClient();
    return name in client;
  } catch {
    return false;
  }
}

export function isPrismaReviewReady(): boolean {
  return prismaHasDelegate("review");
}

export function isPrismaCouponReady(): boolean {
  return prismaHasDelegate("coupon");
}

export function isPrismaRecurringBlockedWeekdayReady(): boolean {
  return prismaHasDelegate("recurringBlockedWeekday");
}

export function isPrismaInternalEventReady(): boolean {
  return prismaHasDelegate("internalEvent");
}

/** Franja horaria opcional en bloqueos recurrentes (startTime/endTime). */
export function isPrismaRecurringBlockedWeekdayPartialReady(): boolean {
  if (!isPrismaRecurringBlockedWeekdayReady()) return false;
  const recurring = (
    Prisma as {
      RecurringBlockedWeekdayScalarFieldEnum?: Record<string, string>;
    }
  ).RecurringBlockedWeekdayScalarFieldEnum;
  return Boolean(recurring && "startTime" in recurring && "endTime" in recurring);
}

/** Campos recientes del schema; si faltan, el bundle de Turbopack sigue con client viejo. */
function clientHasExpectedSchema(): boolean {
  const purchase = Prisma.ResourcePurchaseScalarFieldEnum;
  const payment = Prisma.PaymentScalarFieldEnum;
  const consultation = (
    Prisma as { ConsultationTypeScalarFieldEnum?: Record<string, string> }
  ).ConsultationTypeScalarFieldEnum;
  const recurring = (
    Prisma as {
      RecurringBlockedWeekdayScalarFieldEnum?: Record<string, string>;
    }
  ).RecurringBlockedWeekdayScalarFieldEnum;

  // Si el module de Prisma ya se regeneró, exigí el modelo nuevo.
  // Si aún no está en el bundle, no tiramos el client entero (OPTIONAL_DELEGATES).
  if (recurring && !("weekday" in recurring)) return false;

  if (consultation) {
    const hasLobbyFields =
      "isPublished" in consultation &&
      "sortOrder" in consultation &&
      "imageUrl" in consultation;
    if (!hasLobbyFields) return false;
  }

  if (!purchase || !payment) return true;
  return (
    "inboxDismissedAt" in purchase &&
    "advanceInboxTrashedAt" in payment
  );
}

function createPrismaClient(): PrismaClient {
  const log =
    process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  const client = new PrismaClientCtor(
    createNeonPrismaClientOptions(log as ("error" | "warn")[]) as ConstructorParameters<
      typeof PrismaClientCtor
    >[0],
  );

  if (!hasRequiredDelegates(client) || !clientHasExpectedSchema()) {
    const missing = REQUIRED_DELEGATES.filter((key) => !(key in client));
    const message =
      missing.length > 0
        ? `Prisma Client desactualizado (falta: ${missing.join(", ")}). Ejecutá: pnpm db:generate && pnpm dev:clean`
        : "Prisma Client desactualizado. Ejecutá: pnpm db:generate && pnpm dev:clean";
    if (process.env.NODE_ENV === "production") {
      console.error(`[prisma] ${message}`);
    } else {
      throw new Error(message);
    }
  }

  return client;
}

function getPrismaClient(): PrismaClient {
  const currentMtime = schemaMtimeMs();

  if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
    const stale =
      globalForPrisma.prismaSchemaMtime === undefined ||
      globalForPrisma.prismaSchemaMtime !== currentMtime ||
      !hasRequiredDelegates(globalForPrisma.prisma) ||
      !clientHasExpectedSchema();

    if (stale) {
      void globalForPrisma.prisma.$disconnect();
      globalForPrisma.prisma = undefined;
    }
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaMtime = currentMtime;
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
