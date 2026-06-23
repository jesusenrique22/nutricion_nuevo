import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export type AuthSession = Session & { user: { id: string; role: string } };

export async function requireSession(): Promise<AuthSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as AuthSession;
}

export async function requireAdmin(): Promise<AuthSession | null> {
  const session = await requireSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

/** Paciente accediendo a su propio dato, o admin. */
export async function requireSelfOrAdmin(
  userId: string,
): Promise<AuthSession | null> {
  const session = await requireSession();
  if (!session) return null;
  if (session.user.role === "ADMIN" || session.user.id === userId) {
    return session;
  }
  return null;
}
