/**
 * Arranque del servidor: avisa configuración incorrecta sin tumbar el proceso.
 * @see src/lib/env/production-safety.ts
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureDatabaseEnv } = await import("@/lib/database-url");
  ensureDatabaseEnv();

  const { logProductionConfigOnStartup } = await import(
    "@/lib/env/production-safety"
  );
  logProductionConfigOnStartup();

  if (process.env.DATABASE_URL?.includes("neon.tech")) {
    try {
      const { prisma } = await import("@/server/db/prisma");
      await prisma.$queryRaw`SELECT 1`;
      console.log("[db] ✓ Conexión Neon activa (WebSocket)");
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      console.error(`[db] ✗ No se pudo conectar a Neon: ${msg}`);
      console.error("[db] Verificá DATABASE_URL en .env y ejecutá: pnpm run db:check");
    }
  }
}
