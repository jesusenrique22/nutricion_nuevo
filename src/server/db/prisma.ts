import { createRequire } from "node:module";
import { statSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

const require = createRequire(path.join(process.cwd(), "package.json"));

/** CJS evita client incompleto con Turbopack/ESM (delegates como cartItem ausentes). */
const { PrismaClient: PrismaClientCtor, Prisma } = require("@prisma/client") as {
  PrismaClient: new (options?: ConstructorParameters<typeof PrismaClient>[0]) => PrismaClient;
  Prisma: {
    ResourcePurchaseScalarFieldEnum?: Record<string, string>;
    PaymentScalarFieldEnum?: Record<string, string>;
  };
};

const REQUIRED_DELEGATES = ["user", "cartItem"] as const;

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

/** Campos recientes del schema; si faltan, el bundle de Turbopack sigue con client viejo. */
function clientHasExpectedSchema(): boolean {
  const purchase = Prisma.ResourcePurchaseScalarFieldEnum;
  const payment = Prisma.PaymentScalarFieldEnum;
  const consultation = (
    Prisma as { ConsultationTypeScalarFieldEnum?: Record<string, string> }
  ).ConsultationTypeScalarFieldEnum;

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
  const client = new PrismaClientCtor({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (!hasRequiredDelegates(client) || !clientHasExpectedSchema()) {
    const message =
      "Prisma Client desactualizado. Ejecuta: pnpm prisma generate && reinicia el servidor.";
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
