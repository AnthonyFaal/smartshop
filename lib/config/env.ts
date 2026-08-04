import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("SmartShop"),

  DATABASE_URL: z.string().min(1),
  DATABASE_READ_URL: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_REDIS_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  CSRF_SECRET: z.string().min(32),

  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_UPLOADS: z.string().default("smartshop-uploads"),
  S3_BUCKET_PRODUCTS: z.string().default("smartshop-products"),
  S3_BUCKET_AVATARS: z.string().default("smartshop-avatars"),
  S3_PUBLIC_URL: z.string().optional(),

  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  AI_MAX_TOKENS: z.coerce.number().default(4096),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().default("noreply@smartshop.gh"),

  SMS_PROVIDER: z.string().default("hubtel"),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().default("SmartShop"),

  PAYMENT_PROVIDER: z.string().default("mock"),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  OTEL_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  PILOT_CAMPUS_NAME: z.string().default("UMaT"),
  PILOT_CAMPUS_LAT: z.coerce.number().default(5.303),
  PILOT_CAMPUS_LNG: z.coerce.number().default(-1.989),
  PILOT_CAMPUS_RADIUS_KM: z.coerce.number().default(5),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const trimmedEnv = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ])
  );

  const withDefaults = {
    ...trimmedEnv,
    REDIS_URL:
      trimmedEnv.UPSTASH_REDIS_URL ??
      trimmedEnv.REDIS_URL ??
      "redis://localhost:6379",
    DATABASE_URL:
      trimmedEnv.DATABASE_URL ??
      "postgresql://smartshop:smartshop@localhost:5432/smartshop",
    JWT_SECRET:
      trimmedEnv.JWT_SECRET ??
      "dev-only-secret-change-in-production-32chars!!",
    CSRF_SECRET:
      trimmedEnv.CSRF_SECRET ??
      "dev-only-csrf-secret-change-in-production!",
  };

  if (trimmedEnv.NODE_ENV === "production" && (!trimmedEnv.JWT_SECRET || !trimmedEnv.CSRF_SECRET)) {
    throw new Error("JWT_SECRET and CSRF_SECRET must be explicitly configured in production");
  }

  const result = envSchema.safeParse(withDefaults);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

export const env = parseEnv();
