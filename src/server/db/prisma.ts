import { statSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

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

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const currentMtime = schemaMtimeMs();

  if (process.env.NODE_ENV !== "production") {
    const staleSchema =
      globalForPrisma.prisma &&
      (globalForPrisma.prismaSchemaMtime === undefined ||
        globalForPrisma.prismaSchemaMtime !== currentMtime ||
        !("mediaAsset" in globalForPrisma.prisma));

    if (staleSchema) {
      void globalForPrisma.prisma?.$disconnect();
      globalForPrisma.prisma = undefined;
    }
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaMtime = currentMtime;
  }

  return globalForPrisma.prisma;
}

/** Proxy evita usar un PrismaClient obsoleto tras `prisma generate` sin reiniciar el dev server. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
