import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { redis, cacheKeys } from "@/lib/redis/client";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/csrf";
import type { User, UserRole } from "@prisma/client";

const ACCESS_COOKIE_MAX_AGE = 15 * 60;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
const MAX_SESSIONS_PER_USER = 5;

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  phone: string | null;
  phoneVerified: boolean;
  verificationLevel: User["verificationLevel"];
}

export async function createSession(
  user: User,
  metadata: { userAgent?: string; ipAddress?: string; deviceId?: string }
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE * 1000);

  const existingSessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { lastUsedAt: "asc" },
  });

  if (existingSessions.length >= MAX_SESSIONS_PER_USER) {
    const toRemove = existingSessions.slice(
      0,
      existingSessions.length - MAX_SESSIONS_PER_USER + 1
    );
    await prisma.session.deleteMany({
      where: { id: { in: toRemove.map((s) => s.id) } },
    });
    for (const s of toRemove) {
      await redis.del(cacheKeys.session(s.id));
    }
  }

  const refreshToken = await signRefreshToken({
    userId: user.id,
    sessionId: "pending",
  });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      deviceId: metadata.deviceId,
      expiresAt,
    },
  });

  const finalRefreshToken = await signRefreshToken({
    userId: user.id,
    sessionId: session.id,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: finalRefreshToken },
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  await redis.setex(
    cacheKeys.session(session.id),
    REFRESH_COOKIE_MAX_AGE,
    JSON.stringify({ userId: user.id, role: user.role })
  );

  return {
    accessToken,
    refreshToken: finalRefreshToken,
    sessionId: session.id,
  };
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const payload = await verifyAccessToken(accessToken);
    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        isSuspended: false,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        phone: true,
        phoneVerified: true,
        verificationLevel: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function refreshSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const payload = await verifyRefreshToken(refreshToken);
    const session = await prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            phone: true,
            phoneVerified: true,
            verificationLevel: true,
            isActive: true,
            isSuspended: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !session ||
      !session.user.isActive ||
      session.user.isSuspended ||
      session.user.deletedAt
    ) {
      return null;
    }

    const accessToken = await signAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    await setAuthCookies(accessToken, refreshToken);
    return session.user;
  } catch {
    return null;
  }
}

export async function destroySession(sessionId?: string): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      const payload = await verifyRefreshToken(refreshToken);
      const id = sessionId ?? payload.sessionId;
      await prisma.session.delete({ where: { id } }).catch(() => {});
      await redis.del(cacheKeys.session(id));
    } catch {
      // Token invalid — clear cookies anyway
    }
  }

  await clearAuthCookies();
}
