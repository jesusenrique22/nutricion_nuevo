import NextAuth from "next-auth";
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
            throw new Error("ACCOUNT_DEACTIVATED");
          }

          if (user.role === "PATIENT" && !user.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message === "ACCOUNT_DEACTIVATED" ||
              err.message === "EMAIL_NOT_VERIFIED")
          ) {
            throw err;
          }
          console.error("[auth/credentials]", err);
          throw err;
        }
      },
    }),
  ],
});
