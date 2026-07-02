import { Redis as UpstashRedis } from "@upstash/redis";
import IoRedis from "ioredis";
import { env } from "@/lib/config/env";

export interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
}

const globalForRedis = globalThis as unknown as {
  redis: RedisClient | undefined;
};

function isUpstashTcp(url: string): boolean {
  return url.startsWith("rediss://") || url.includes(".upstash.io");
}

function useUpstashRest(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

function createUpstashRestClient(): RedisClient {
  const client = new UpstashRedis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return {
    async get(key) {
      const value = await client.get(key);
      if (value === null || value === undefined) return null;
      return typeof value === "string" ? value : JSON.stringify(value);
    },
    async setex(key, seconds, value) {
      await client.set(key, value, { ex: seconds });
    },
    async del(...keys) {
      if (keys.length === 0) return 0;
      return client.del(...keys);
    },
    async incr(key) {
      return client.incr(key);
    },
    async expire(key, seconds) {
      return client.expire(key, seconds);
    },
    async ttl(key) {
      return client.ttl(key);
    },
    async keys(pattern) {
      return client.keys(pattern);
    },
    async ping() {
      return client.ping();
    },
  };
}

function createIoRedisClient(): RedisClient {
  const client = new IoRedis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
    ...(isUpstashTcp(env.REDIS_URL) && { family: 0 }),
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message || String(err));
  });

  return {
    get: (key) => client.get(key),
    setex: (key, seconds, value) => client.setex(key, seconds, value),
    del: (...keys) => (keys.length ? client.del(...keys) : Promise.resolve(0)),
    incr: (key) => client.incr(key),
    expire: (key, seconds) => client.expire(key, seconds),
    ttl: (key) => client.ttl(key),
    keys: (pattern) => client.keys(pattern),
    ping: async () => {
      if (client.status !== "ready") await client.connect();
      return client.ping();
    },
  };
}

function createRedisClient(): RedisClient {
  if (useUpstashRest()) {
    console.info("[Redis] Using Upstash REST client");
    return createUpstashRestClient();
  }

  console.info(`[Redis] Using ioredis at ${env.REDIS_URL.replace(/:[^:@]+@/, ":***@")}`);
  return createIoRedisClient();
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function connectRedis(): Promise<void> {
  await redis.ping();
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
  passwordReset: (userId: string) => `pwd-reset:${userId}`,
  otpCooldown: (identifier: string, purpose: string) => `otp-cooldown:${purpose}:${identifier}`,
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
