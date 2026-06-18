import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/** Auth para proxy/middleware (Edge). No importar prisma ni bcrypt aquí. */
export const { auth: edgeAuth } = NextAuth(authConfig);
