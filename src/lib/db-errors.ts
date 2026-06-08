import { Prisma } from "@prisma/client";

/** Mensaje amigable cuando Prisma no puede conectar a PostgreSQL. */
export function getDbErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "No se pudo conectar a la base de datos. Revisa DATABASE_URL en tu archivo .env (usuario y contraseña de PostgreSQL).";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1000") {
      return "Credenciales de PostgreSQL inválidas. Actualiza DATABASE_URL en .env con tu usuario y contraseña reales.";
    }
    if (error.code === "P1001") {
      return "No se puede alcanzar el servidor PostgreSQL. Verifica que esté corriendo en localhost:5432.";
    }
    if (error.code === "P1003") {
      return 'La base de datos "nutricion" no existe. Créala en pgAdmin y ejecuta: npm run db:migrate';
    }
  }
  return null;
}

/** Ejecuta una operación Prisma y devuelve error amigable si falla la conexión. */
export async function withDb<T>(
  fn: () => Promise<T>,
  fallbackMessage = "Error de base de datos. Intenta de nuevo más tarde.",
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    const dbMessage = getDbErrorMessage(error);
    if (dbMessage) return { ok: false, message: dbMessage };
    console.error(error);
    return { ok: false, message: fallbackMessage };
  }
}
