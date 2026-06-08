import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Anti-spam (Módulo 2). Si Upstash no está configurado, se desactiva en dev.
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const enabled = Boolean(url && token);

const redis = enabled
  ? new Redis({ url: url as string, token: token as string })
  : null;

// Límite para creación de citas: 5 peticiones cada 60s por identificador
export const appointmentLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "rl:appointment",
    })
  : null;

type LimitResult = { success: boolean; remaining: number };

/**
 * Aplica rate limit por identificador (IP o userId).
 * En dev sin Upstash, permite todo (success=true).
 */
export async function limitByKey(key: string): Promise<LimitResult> {
  if (!appointmentLimiter) {
    return { success: true, remaining: Infinity };
  }
  const { success, remaining } = await appointmentLimiter.limit(key);
  return { success, remaining };
}
