import { redis, cacheKeys } from "@/lib/redis/client";
import { env } from "@/lib/config/env";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = env.RATE_LIMIT_MAX_REQUESTS,
  windowMs = env.RATE_LIMIT_WINDOW_MS
): Promise<RateLimitResult> {
  const key = cacheKeys.rateLimit(identifier, endpoint);
  const windowSeconds = Math.ceil(windowMs / 1000);

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
}
