import { redis, cacheKeys } from "@/lib/redis/client";

export async function getNextAllowedAt(params: {
  identifier: string;
  purpose: string;
}): Promise<number> {
  const key = cacheKeys.otpCooldown(params.identifier, params.purpose);
  const ttlSeconds = await redis.ttl(key);
  if (ttlSeconds <= 0) return Date.now();
  return Date.now() + ttlSeconds * 1000;
}

export async function setOtpCooldown(params: {
  identifier: string;
  purpose: string;
  seconds: number;
}): Promise<number> {
  const nextAllowedAt = Date.now() + params.seconds * 1000;
  const key = cacheKeys.otpCooldown(params.identifier, params.purpose);

  // Store a marker value; we rely on TTL for cooldown enforcement.
  await redis.setex(key, params.seconds, String(nextAllowedAt));
  return nextAllowedAt;
}

