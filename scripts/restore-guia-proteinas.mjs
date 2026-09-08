#!/usr/bin/env node
/**
 * Restaura / normaliza «Guía de porciones proteicas» en Neon.
 * Prioriza el registro que ya tenga PDF y compras vinculadas.
 *
 * Uso: pnpm run db:restore-guia
 */
import { Prisma } from "@prisma/client";
import { ensureDatabaseEnv } from "./ensure-database-env.mjs";
import { createPrismaClient } from "./create-prisma-client.mjs";

ensureDatabaseEnv();

const FALLBACK_ID = "guia-porciones-proteicas";
const TITLE = "Guía de porciones proteicas";

const METADATA = {
  title: TITLE,
  description:
    "Sistema de puntos para contar más fácilmente la cantidad de proteína que ingieres.",
  type: "EBOOK",
  category: "Nutrición",
  body: "Para saber a cuánto apuntar agenda tu cita para un asesoramiento individualizado.",
  isPublished: true,
  sortOrder: 2,
};

async function purchaseCount(prisma, resourceId) {
  return prisma.resourcePurchase.count({ where: { resourceId } });
}

async function main() {
  const prisma = createPrismaClient();

  const matches = await prisma.resource.findMany({
    where: {
      OR: [
        { id: FALLBACK_ID },
        { title: { equals: TITLE, mode: "insensitive" } },
        { title: { equals: "Guia de porciones proteicas", mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  let canonical = matches[0] ?? null;

  if (matches.length > 1) {
    const scored = await Promise.all(
      matches.map(async (r) => ({
        resource: r,
        purchases: await purchaseCount(prisma, r.id),
        hasContent: Boolean(r.contentUrl),
      })),
    );
    scored.sort((a, b) => {
      if (a.hasContent !== b.hasContent) return a.hasContent ? -1 : 1;
      if (a.purchases !== b.purchases) return b.purchases - a.purchases;
      return 0;
    });
    canonical = scored[0]?.resource ?? null;
  }

  if (!canonical) {
    canonical = await prisma.resource.create({
      data: {
        id: FALLBACK_ID,
        ...METADATA,
        price: new Prisma.Decimal(0),
        currency: "ARS",
      },
    });
    console.log("Recurso creado:", canonical.id);
    console.log("Subí el PDF en Admin → Recursos → Archivo principal.");
    await prisma.$disconnect();
    return;
  }

  const resource = await prisma.resource.update({
    where: { id: canonical.id },
    data: METADATA,
  });

  console.log("Recurso restaurado:", resource.id, "—", resource.title);
  if (resource.contentUrl) {
    console.log("PDF vinculado:", resource.contentUrl);
  } else {
    console.log("Sin PDF: subilo en Admin → Recursos → Archivo principal.");
  }

  for (const dup of matches) {
    if (dup.id === canonical.id) continue;
    const purchases = await purchaseCount(prisma, dup.id);
    if (purchases === 0) {
      await prisma.resource.delete({ where: { id: dup.id } });
      console.log("Duplicado eliminado:", dup.id);
    } else {
      await prisma.resource.update({
        where: { id: dup.id },
        data: { isPublished: false, title: `${dup.title} (duplicado)` },
      });
      console.log(
        "Duplicado despublicado (tiene compras vinculadas):",
        dup.id,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
