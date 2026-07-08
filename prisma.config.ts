import { defineConfig } from "prisma/config";
import { ensureDatabaseEnv } from "./scripts/ensure-database-env.mjs";

// Deriva DIRECT_DATABASE_URL desde DATABASE_URL (Neon pooler → directo) antes de validar el schema.
ensureDatabaseEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
