import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env } from "@/lib/config/env";

export function generateCsrfToken(): string {
  const token = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", env.CSRF_SECRET)
    .update(token)
    .digest("hex");
  return `${token}.${signature}`;
}

export function validateCsrfToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [value, signature] = parts;
  const expected = createHmac("sha256", env.CSRF_SECRET)
    .update(value)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export const CSRF_COOKIE_NAME = "smartshop_csrf";
export const ACCESS_TOKEN_COOKIE = "smartshop_access";
export const REFRESH_TOKEN_COOKIE = "smartshop_refresh";
