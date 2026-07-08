#!/usr/bin/env node
/**
 * Verifica la conexión a PostgreSQL (Neon) usando DATABASE_URL del .env
 * Uso: pnpm run db:check
 */
import { createPrismaClient } from "./create-prisma-client.mjs";

const prisma = createPrismaClient();

async function main() {
  console.log("Comprobando conexión a PostgreSQL…\n");

  const url = process.env.DATABASE_URL ?? "";
  const masked = url.replace(/:([^:@/]+)@/, ":****@");
  console.log("DATABASE_URL:", masked || "(no definida)");
  console.log(
    "Driver:",
    url.includes("neon.tech") ? "Neon WebSocket (adapter)" : "TCP estándar",
  );

  const direct = process.env.DIRECT_DATABASE_URL ?? "";
  if (direct && direct !== url) {
    console.log(
      "DIRECT_DATABASE_URL:",
      direct.replace(/:([^:@/]+)@/, ":****@"),
    );
  }

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("\n✓ Conexión exitosa.");

    const tables = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const count = Number(tables[0]?.count ?? 0);
    if (count === 0) {
      console.log("\n⚠ La base de datos está vacía. Ejecuta:");
      console.log("   pnpm run db:migrate");
      console.log("   pnpm run db:seed");
    } else {
      console.log(`\n✓ ${count} tablas encontradas en el esquema public.`);

      const users = await prisma.user.count();
      const contents = await prisma.siteContent.count();
      console.log(`✓ ${users} usuarios, ${contents} registros de contenido CMS.`);

      const admin = await prisma.user.findFirst({
        where: { email: "admin@gmail.com" },
        select: { passwordHash: true, emailVerified: true, role: true },
      });
      if (!admin?.passwordHash) {
        console.log(
          "\n⚠ No hay usuario admin con contraseña. Ejecutá: pnpm run db:seed",
        );
      } else {
        console.log(
          `✓ Admin listo (${admin.role}, email ${admin.emailVerified ? "verificado" : "sin verificar"}).`,
        );
        console.log("  Login demo: admin@gmail.com / Admin123!");
      }
    }
  } catch (error) {
    console.error("\n✗ Error de conexión:\n");
    if (error instanceof Error) {
      console.error(error.message);
    }
    console.error(`
Solución (Neon):
1. Abrí console.neon.tech → tu proyecto debe estar "Active".
2. Connection details → copiá la URL **Pooled** en DATABASE_URL.
3. Si falta DIRECT_DATABASE_URL, el script la deriva automáticamente al arrancar.
4. Si sigue fallando: "Reset password" en Neon y volvé a copiar la URL.

Luego: pnpm run db:migrate && pnpm run db:seed
`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
