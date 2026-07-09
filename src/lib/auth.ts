import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { normalizeEmail } from "@/lib/normalize-email";
import { prisma } from "@/server/db/prisma";
import { authConfig } from "@/lib/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Errores de login con `code` legible en el cliente (res.code de signIn). */
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}
class AccountDeactivatedError extends CredentialsSignin {
  code = "ACCOUNT_DEACTIVATED";
}
class DatabaseUnavailableError extends CredentialsSignin {
  code = "DATABASE_UNAVAILABLE";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (raw) => {
        try {
          const parsed = credentialsSchema.safeParse(raw);
          if (!parsed.success) return null;

          const email = normalizeEmail(parsed.data.email);
          const password = parsed.data.password;
          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            include: {
              patientProfile: { select: { hiddenFromAdminList: true } },
            },
          });
          if (!user?.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          if (
            user.role === "PATIENT" &&
            user.patientProfile?.hiddenFromAdminList
          ) {
            throw new AccountDeactivatedError();
          }

          if (user.role === "PATIENT" && !user.emailVerified) {
            throw new EmailNotVerifiedError();
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (err) {
          if (err instanceof CredentialsSignin) {
            throw err;
          }
          const code =
            err && typeof err === "object" && "code" in err
              ? String((err as { code?: string }).code)
              : "";
          const message = err instanceof Error ? err.message : String(err);
          if (
            code.startsWith("P") ||
            code === "ECONNREFUSED" ||
            code === "ETIMEDOUT" ||
            code === "MODULE_NOT_FOUND" ||
            message.includes("Cannot find module") ||
            message.includes("@neondatabase/serverless")
          ) {
            console.error("[auth/credentials] Base de datos:", err);
            throw new DatabaseUnavailableError();
          }
          console.error("[auth/credentials]", err);
          return null;
        }
      },
    }),
  ],
});
