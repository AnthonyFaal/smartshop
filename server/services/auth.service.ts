import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import {
  createSession,
  setAuthCookies,
  destroySession,
} from "@/lib/auth/session";
import { redis, cacheKeys } from "@/lib/redis/client";
import { Errors } from "@/server/errors";
import { createNotification } from "@/lib/notifications/service";
import type { OtpPurpose } from "@prisma/client";
import { randomInt } from "crypto";

const OTP_EXPIRY_SECONDS = 600;
const OTP_MAX_ATTEMPTS = 5;

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const passwordCheck = validatePasswordStrength(input.password);
  if (!passwordCheck.valid) {
    throw Errors.badRequest(passwordCheck.errors.join(". "));
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: input.email.toLowerCase() },
        ...(input.phone ? [{ phone: input.phone }] : []),
      ],
      deletedAt: null,
    },
  });

  if (existing) {
    throw Errors.conflict("An account with this email or phone already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash,
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            displayName: `${input.firstName} ${input.lastName}`,
          },
        },
        subscription: {
          create: {
            plan: "FREE",
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        },
        trustScore: { create: { score: 0 } },
        cart: { create: {} },
        wishlists: { create: { name: "My Wishlist", isDefault: true } },
      },
      include: { profile: true },
    });

    await tx.auditLog.create({
      data: {
        userId: created.id,
        action: "CREATE",
        entityType: "User",
        entityId: created.id,
        ipAddress: input.ipAddress,
        newValues: { email: created.email },
      },
    });

    return created;
  });

  const session = await createSession(user, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });
  await setAuthCookies(session.accessToken, session.refreshToken);

  return { user, sessionId: session.sessionId };
}

export async function loginUser(input: {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email.toLowerCase(),
      deletedAt: null,
    },
    include: { profile: true },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw Errors.unauthorized();
  }

  if (!user.isActive || user.isSuspended) {
    throw Errors.forbidden("Your account has been suspended");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      ipAddress: input.ipAddress,
    },
  });

  const session = await createSession(user, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });
  await setAuthCookies(session.accessToken, session.refreshToken);

  return { user, sessionId: session.sessionId };
}

export async function logoutUser(): Promise<void> {
  await destroySession();
}

export async function sendOtp(input: {
  phone: string;
  purpose: OtpPurpose;
  userId?: string;
}): Promise<void> {
  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  await prisma.otpRecord.create({
    data: {
      userId: input.userId,
      phone: input.phone,
      code,
      purpose: input.purpose,
      expiresAt,
    },
  });

  await redis.setex(
    cacheKeys.otp(input.phone, input.purpose),
    OTP_EXPIRY_SECONDS,
    code
  );

  // SMS dispatch via notification service (logs OTP in dev when SMS is not configured)
  if (input.userId) {
    await createNotification({
      userId: input.userId,
      type: "VERIFICATION",
      title: "Verification Code",
      body: `Your SmartShop code is ${code}. Valid for 10 minutes.`,
      channels: ["SMS", "IN_APP"],
    });
  }

  console.info(`[OTP] Code for ${input.phone} (${input.purpose}): ${code}`);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
  });

  if (!user) return;

  const code = randomInt(100000, 999999).toString();

  await prisma.otpRecord.create({
    data: {
      userId: user.id,
      phone: user.phone ?? user.email,
      code,
      purpose: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
    },
  });

  await redis.setex(
    cacheKeys.passwordReset(user.id),
    OTP_EXPIRY_SECONDS,
    code
  );

  await createNotification({
    userId: user.id,
    type: "VERIFICATION",
    title: "Password Reset Code",
    body: `Your SmartShop password reset code is ${code}. Valid for 10 minutes.`,
    channels: user.phone ? ["SMS", "EMAIL", "IN_APP"] : ["EMAIL", "IN_APP"],
  });

  console.info(`[Password Reset] Code for ${email}: ${code}`);
}

export async function resetPassword(input: {
  email: string;
  code: string;
  password: string;
}): Promise<void> {
  const passwordCheck = validatePasswordStrength(input.password);
  if (!passwordCheck.valid) {
    throw Errors.badRequest(passwordCheck.errors.join(". "));
  }

  const user = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), deletedAt: null },
  });

  if (!user) {
    throw Errors.badRequest("Invalid reset code");
  }

  const cached = await redis.get(cacheKeys.passwordReset(user.id));
  const record = await prisma.otpRecord.findFirst({
    where: {
      userId: user.id,
      purpose: "PASSWORD_RESET",
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw Errors.badRequest("Reset code expired or not found");
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw Errors.badRequest("Maximum attempts exceeded. Request a new code.");
  }

  const isValid = input.code === cached || input.code === record.code;
  if (!isValid) {
    await prisma.otpRecord.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw Errors.badRequest("Invalid reset code");
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.otpRecord.update({
      where: { id: record.id },
      data: { verified: true },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "User",
        entityId: user.id,
        newValues: { passwordReset: true },
      },
    }),
  ]);

  await redis.del(cacheKeys.passwordReset(user.id));

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: "Password Updated",
    body: "Your SmartShop password was changed successfully.",
    channels: ["IN_APP", "EMAIL"],
  });
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const passwordCheck = validatePasswordStrength(input.newPassword);
  if (!passwordCheck.valid) {
    throw Errors.badRequest(passwordCheck.errors.join(". "));
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw Errors.badRequest("Current password is incorrect");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entityType: "User",
        entityId: user.id,
        newValues: { passwordChanged: true },
      },
    }),
  ]);

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: "Password Changed",
    body: "Your password was updated. Contact support if you did not make this change.",
    channels: ["IN_APP", "EMAIL"],
  });
}

export async function verifyOtp(input: {
  phone: string;
  code: string;
  purpose: OtpPurpose;
  userId: string;
}): Promise<void> {
  const cached = await redis.get(
    cacheKeys.otp(input.phone, input.purpose)
  );

  const record = await prisma.otpRecord.findFirst({
    where: {
      phone: input.phone,
      purpose: input.purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw Errors.badRequest("OTP expired or not found");
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw Errors.badRequest("Maximum OTP attempts exceeded");
  }

  const isValid = input.code === cached || input.code === record.code;

  if (!isValid) {
    await prisma.otpRecord.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw Errors.badRequest("Invalid OTP code");
  }

  await prisma.$transaction([
    prisma.otpRecord.update({
      where: { id: record.id },
      data: { verified: true },
    }),
    ...(input.purpose === "PHONE_VERIFICATION"
      ? [
          prisma.user.update({
            where: { id: input.userId },
            data: {
              phone: input.phone,
              phoneVerified: true,
              verificationLevel: "PHONE_VERIFIED",
            },
          }),
        ]
      : []),
  ]);

  await redis.del(cacheKeys.otp(input.phone, input.purpose));

  const notificationByPurpose = {
    PHONE_VERIFICATION: {
      title: "Phone Verified",
      body: "Your phone number has been successfully verified.",
    },
    PASSWORD_RESET: {
      title: "Verification Complete",
      body: "You can now set a new password.",
    },
    LOGIN: {
      title: "Login Verified",
      body: "Phone verification for login was successful.",
    },
  } as const;

  const notification = notificationByPurpose[input.purpose];

  await createNotification({
    userId: input.userId,
    type: "VERIFICATION",
    title: notification.title,
    body: notification.body,
  });
}
