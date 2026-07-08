/** ¿La URL apunta a Neon (producción / remoto)? */
export function isNeonDatabaseUrl(url: string): boolean {
  return url.includes("neon.tech");
}

/** Parámetros recomendados para Neon pooled (PgBouncer 1.21+ no usa pgbouncer=true). */
export function normalizeDatabaseUrl(raw: string): string {
  const input = raw.trim();
  if (!input) return input;

  try {
    const url = new URL(input);
    if (!isNeonDatabaseUrl(url.hostname)) return input;

    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    if (process.env.NODE_ENV !== "production") {
      // Siempre sobrescribir en dev: dev.mjs puede haber dejado connection_limit=5.
      url.searchParams.set("connection_limit", "15");
      url.searchParams.set("pool_timeout", "45");
    }

    return url.toString();
  } catch {
    return input;
  }
}

/** URL directa (sin -pooler) para migraciones y Prisma CLI. */
export function deriveNeonDirectUrl(pooledUrl: string): string | undefined {
  if (!pooledUrl.includes("-pooler")) return undefined;

  try {
    const url = new URL(pooledUrl);
    url.hostname = url.hostname.replace("-pooler", "");
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "30");
    }
    return url.toString();
  } catch {
    return pooledUrl
      .replace("-pooler", "")
      .replace(/[?&]pgbouncer=true/g, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

let databaseEnvReady = false;

/** Normaliza DATABASE_URL y deriva DIRECT_DATABASE_URL si falta. */
export function ensureDatabaseEnv(): void {
  if (databaseEnvReady) return;

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return;

  if (!process.env.DIRECT_DATABASE_URL?.trim()) {
    const direct = deriveNeonDirectUrl(raw);
    process.env.DIRECT_DATABASE_URL = direct ?? raw;
  }

  process.env.DATABASE_URL = normalizeDatabaseUrl(raw);
  databaseEnvReady = true;
}

export function getDatabaseUrl(): string {
  ensureDatabaseEnv();
  return process.env.DATABASE_URL?.trim() ?? "";
}
