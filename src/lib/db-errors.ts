import { Prisma } from "@prisma/client";
import {
  isTimeSlotConflictError,
  TIME_SLOT_TAKEN_MESSAGE,
} from "@/lib/scheduling-errors";

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
    if (error.code === "P2002") {
      return "Ya existe un registro con esos datos.";
    }
    if (error.code === "P2003" || error.code === "P2014") {
      return "No se puede completar la operación porque hay registros vinculados.";
    }
    if (error.code === "P2025") {
      return "El registro ya no existe.";
    }
    if (error.code === "P2022") {
      return "La base de datos en producción no está actualizada. Ejecutá las migraciones (pnpm run db:migrate en Neon o redeploy en Vercel con migrate deploy).";
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Error interno de datos. Recargá la página e intentá de nuevo.";
  }
  return null;
}

/** Mensaje legible para acciones de servidor (evita pantallas de error crudas). */
export function formatActionError(
  error: unknown,
  fallback = "No se pudo completar la acción. Intentá de nuevo.",
): string {
  if (isTimeSlotConflictError(error)) {
    return TIME_SLOT_TAKEN_MESSAGE;
  }

  const dbMessage = getDbErrorMessage(error);
  if (dbMessage) return dbMessage;

  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("23001") ||
      msg.includes("foreign key") ||
      msg.includes("violates RESTRICT")
    ) {
      return "No se puede eliminar porque hay registros vinculados.";
    }
    if (msg.includes("Unknown argument") || msg.includes("Invalid `prisma.")) {
      return "Error interno. Recargá la página e intentá de nuevo.";
    }
    if (
      msg.includes("does not exist") &&
      (msg.includes("column") || msg.includes("Column"))
    ) {
      return "Faltan migraciones en la base de datos. En Vercel, verificá que el build ejecute prisma migrate deploy; o corré pnpm exec prisma migrate deploy contra Neon.";
    }
    if (msg.includes("Prisma Client desactualizado")) {
      return "El cliente Prisma no coincide con el schema. Redeploy en Vercel o ejecutá pnpm exec prisma generate.";
    }
    if (msg.length > 0 && msg.length <= 240) return msg;
  }

  return fallback;
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
    if (error instanceof Error && error.message.length <= 200) {
      return { ok: false, message: error.message };
    }
    console.error(error);
    return { ok: false, message: fallbackMessage };
  }
}
