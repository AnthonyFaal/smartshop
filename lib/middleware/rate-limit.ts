import { redis, cacheKeys } from "@/lib/redis/client";
import { env } from "@/lib/config/env";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

let lastRedisWarningAt = 0;

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = env.RATE_LIMIT_MAX_REQUESTS,
  windowMs = env.RATE_LIMIT_WINDOW_MS
): Promise<RateLimitResult> {
  const key = cacheKeys.rateLimit(identifier, endpoint);
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetAt,
    };
  } catch (error) {
    // Production must not silently lose brute-force protection. Local
    // development, however, intentionally works without a Redis container so
    // contributors can run the app and seed/login flows from a fresh checkout.
    if (Date.now() - lastRedisWarningAt > 30_000) {
      lastRedisWarningAt = Date.now();
      console.warn("[RateLimit] Redis unavailable; using the configured failure policy.", error instanceof Error ? error.message : String(error));
    }
    const isProduction = env.NODE_ENV === "production";
    return {
      allowed: !isProduction,
      remaining: isProduction ? 0 : maxRequests,
      resetAt: Date.now() + windowMs,
    };
  }
}
