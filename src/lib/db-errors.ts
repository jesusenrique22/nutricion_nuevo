import { Prisma } from "@prisma/client";
import {
  isTimeSlotConflictError,
  TIME_SLOT_TAKEN_MESSAGE,
} from "@/lib/scheduling-errors";

const GENERIC_DB =
  "No pudimos completar la operación en este momento. Intentá de nuevo en unos minutos.";

/** Mensaje amigable cuando Prisma no puede conectar a PostgreSQL. */
export function getDbErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return GENERIC_DB;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1000" || error.code === "P1001" || error.code === "P1003") {
      return GENERIC_DB;
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
      return "El servicio no está disponible temporalmente. Intentá de nuevo más tarde.";
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
    if (
      msg.includes("Unknown argument") ||
      msg.includes("Invalid `prisma.") ||
      msg.includes("Prisma Client") ||
      msg.includes("does not exist") ||
      msg.includes("MONGODB") ||
      msg.includes("MongoDB") ||
      msg.includes("variable de entorno") ||
      msg.includes("DATABASE_URL") ||
      msg.includes(".env")
    ) {
      return "Error interno. Recargá la página e intentá de nuevo.";
    }
  }

  console.error("[action]", error);
  return fallback;
}

/** Ejecuta una operación Prisma y devuelve error amigable si falla la conexión. */
export async function withDb<T>(
  fn: () => Promise<T>,
  fallbackMessage = "No pudimos completar la operación. Intentá de nuevo más tarde.",
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    const dbMessage = getDbErrorMessage(error);
    if (dbMessage) return { ok: false, message: dbMessage };
    console.error("[withDb]", error);
    return { ok: false, message: fallbackMessage };
  }
}
