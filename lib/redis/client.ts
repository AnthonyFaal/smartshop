import Redis from "ioredis";
import { env } from "@/lib/config/env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready") return;
  await redis.connect();
}

export const cacheKeys = {
  session: (id: string) => `session:${id}`,
  otp: (phone: string, purpose: string) => `otp:${phone}:${purpose}`,
  rateLimit: (identifier: string, endpoint: string) =>
    `rl:${identifier}:${endpoint}`,
  product: (id: string) => `product:${id}`,
  hotProducts: (categoryId: string) => `hot:products:${categoryId}`,
  search: (hash: string) => `search:${hash}`,
  userCart: (userId: string) => `cart:${userId}`,
  aiUsage: (userId: string, date: string) => `ai:usage:${userId}:${date}`,
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
