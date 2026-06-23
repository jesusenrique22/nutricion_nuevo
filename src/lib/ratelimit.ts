import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

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

export const appointmentLimiter = createLimiter("rl:appointment", 5, "60 s");
export const authLimiter = createLimiter("rl:auth", 10, "60 s");

type LimitResult = { success: boolean; remaining: number };

function failClosedInProduction(): LimitResult {
  if (isProduction && !rateLimitEnabled) {
    console.error(
      "[security] UPSTASH_REDIS_REST_URL/TOKEN requeridos en producción para rate limiting.",
    );
    return { success: false, remaining: 0 };
  }
  return { success: true, remaining: Infinity };
}

async function runLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<LimitResult> {
  if (!limiter) return failClosedInProduction();
  const { success, remaining } = await limiter.limit(key);
  return { success, remaining };
}

/** Citas públicas / reservas — 5 req / 60 s por clave (IP o userId). */
export async function limitByKey(key: string): Promise<LimitResult> {
  return runLimit(appointmentLimiter, key);
}

/** Registro, reset de contraseña, reenvío de verificación — 10 req / 60 s por IP. */
export async function limitAuthByIp(ip: string): Promise<LimitResult> {
  return runLimit(authLimiter, ip);
}
