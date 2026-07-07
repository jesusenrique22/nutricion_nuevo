import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

export const rateLimitEnabled = Boolean(url && token);

const redis = rateLimitEnabled
  ? new Redis({ url: url as string, token: token as string })
  : null;

const isProduction = process.env.NODE_ENV === "production";

function createLimiter(prefix: string, limit: number, window: `${number} s`) {
  return redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, window),
        analytics: true,
        prefix,
      })
    : null;
}

const APPOINTMENT_LIMIT = 5;
const APPOINTMENT_WINDOW = "60 s" as const;
const AUTH_LIMIT = 10;
const AUTH_WINDOW = "60 s" as const;

export const appointmentLimiter = createLimiter(
  "rl:appointment",
  APPOINTMENT_LIMIT,
  APPOINTMENT_WINDOW,
);
export const authLimiter = createLimiter("rl:auth", AUTH_LIMIT, AUTH_WINDOW);

type LimitResult = { success: boolean; remaining: number };

type MemoryEntry = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryEntry>();
let memoryFallbackWarned = false;

function parseWindowSeconds(window: string): number {
  const n = Number.parseInt(window, 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

function warnMemoryFallback(): void {
  if (memoryFallbackWarned || rateLimitEnabled) return;
  memoryFallbackWarned = true;
  const level = isProduction ? "warn" : "log";
  console[level](
    "[security] Upstash no configurado — rate limit en memoria del proceso. " +
      "Configurá UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN para varias instancias.",
  );
}

function pruneMemoryBuckets(now: number): void {
  if (memoryBuckets.size < 5000) return;
  for (const [key, entry] of memoryBuckets) {
    if (now >= entry.resetAt) memoryBuckets.delete(key);
  }
}

/** Fallback cuando no hay Redis: suficiente para Render/Vercel con una instancia. */
function memoryLimit(
  prefix: string,
  key: string,
  limit: number,
  windowSec: number,
): LimitResult {
  warnMemoryFallback();
  const now = Date.now();
  pruneMemoryBuckets(now);

  const bucketKey = `${prefix}:${key}`;
  const entry = memoryBuckets.get(bucketKey);

  if (!entry || now >= entry.resetAt) {
    memoryBuckets.set(bucketKey, { count: 1, resetAt: now + windowSec * 1000 });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count };
}

async function runLimit(
  limiter: Ratelimit | null,
  prefix: string,
  key: string,
  limit: number,
  window: `${number} s`,
): Promise<LimitResult> {
  if (limiter) {
    const { success, remaining } = await limiter.limit(key);
    return { success, remaining };
  }
  return memoryLimit(prefix, key, limit, parseWindowSeconds(window));
}

/** Citas públicas / reservas — 5 req / 60 s por clave (IP o userId). */
export async function limitByKey(key: string): Promise<LimitResult> {
  return runLimit(
    appointmentLimiter,
    "rl:appointment",
    key,
    APPOINTMENT_LIMIT,
    APPOINTMENT_WINDOW,
  );
}

/** Registro, reset de contraseña, reenvío de verificación — 10 req / 60 s por IP. */
export async function limitAuthByIp(ip: string): Promise<LimitResult> {
  return runLimit(authLimiter, "rl:auth", ip, AUTH_LIMIT, AUTH_WINDOW);
}
