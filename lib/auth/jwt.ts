import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/config/env";
import type { UserRole } from "@prisma/client";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: "access";
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}

function parseExpiry(expiry: string): string {
  return expiry;
}

export async function signAccessToken(payload: {
  userId: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    email: payload.email,
    role: payload.role,
    type: "access",
  } satisfies Omit<AccessTokenPayload, "iat" | "exp">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(parseExpiry(env.JWT_ACCESS_EXPIRY))
    .sign(secret);
}

export async function signRefreshToken(payload: {
  userId: string;
  sessionId: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    sessionId: payload.sessionId,
    type: "refresh",
  } satisfies Omit<RefreshTokenPayload, "iat" | "exp">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(parseExpiry(env.JWT_REFRESH_EXPIRY))
    .sign(secret);
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }
  return payload as AccessTokenPayload;
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return payload as RefreshTokenPayload;
}
