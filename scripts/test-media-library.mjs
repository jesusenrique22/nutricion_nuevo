import { createPrismaClient } from "./create-prisma-client.mjs";

const prisma = createPrismaClient();
try {
  if (!prisma.mediaAsset) {
    throw new Error("Prisma client sin modelo mediaAsset — ejecuta pnpm prisma generate");
  }
  const items = await prisma.mediaAsset.findMany({
    where: { folder: "site", mimeType: { startsWith: "image/" } },
    orderBy: { createdAt: "desc" },
  });
  console.log("OK: biblioteca con", items.length, "imágenes");
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
