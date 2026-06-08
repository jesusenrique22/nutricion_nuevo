#!/usr/bin/env node
/**
 * Verifica la conexión a PostgreSQL usando DATABASE_URL del .env
 * Uso: npm run db:check
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Comprobando conexión a PostgreSQL…\n");

  const url = process.env.DATABASE_URL ?? "";
  const masked = url.replace(/:([^:@/]+)@/, ":****@");
  console.log("DATABASE_URL:", masked || "(no definida)");

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
      console.log("   npm run db:migrate");
      console.log("   npm run db:seed");
    } else {
      console.log(`\n✓ ${count} tablas encontradas en el esquema public.`);
    }
  } catch (error) {
    console.error("\n✗ Error de conexión:\n");
    if (error instanceof Error) {
      console.error(error.message);
    }
    console.error(`
Solución:
1. Abre pgAdmin → servidor "PostgreSQL 18" (localhost:5432)
2. Usa la contraseña que definiste al instalar PostgreSQL 18
3. Crea la base de datos "nutricion" (clic derecho → Create → Database)
4. Edita .env con tu contraseña real:

   DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/nutricion?schema=public"

5. Ejecuta: npm run db:migrate && npm run db:seed
`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
