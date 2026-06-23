// auth.service.ts

import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession, setAuthCookies, destroySession } from "@/lib/auth/session";
import { redis, cacheKeys } from "@/lib/redis/client";
import { Errors } from "@/server/errors";
import { createNotification } from "@/lib/notifications/service";
import { getHtmlTemplates, getPlainNotificationText } from "@/lib/notifications/templates";
import { OtpPurpose } from "@prisma/client";
import { randomInt } from "crypto";

const OTP_EXPIRY_SECONDS = 600;
const OTP_MAX_ATTEMPTS = 5;

function formatExpiryText(expiresInSeconds: number) {
  const minutes = Math.ceil(expiresInSeconds / 60);
  return minutes <= 1 ? "1 minute" : `${minutes} minutes`;
}

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

  if (!user.emailVerified) {
    await sendEmailVerification({ userId: user.id, email: user.email });
    throw Errors.forbidden("EMAIL_VERIFICATION_REQUIRED");
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

export async function sendEmailVerification(input: {
  userId: string;
  email: string;
}): Promise<void> {
  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
  const purpose = OtpPurpose.EMAIL_VERIFICATION;

  await prisma.otpRecord.create({
    data: {
      userId: input.userId,
      email: input.email.toLowerCase(),
      code,
      purpose,
      expiresAt,
    },
  });

  await redis.setex(cacheKeys.otp(input.email, purpose), OTP_EXPIRY_SECONDS, code);

  // 1. Dispatch full styled HTML structure to the user's Email address
  await createNotification({
    userId: input.userId,
    type: "VERIFICATION",
    title: "Verify your email",
    body: getHtmlTemplates.emailVerification(code, formatExpiryText(OTP_EXPIRY_SECONDS)),
    channels: ["EMAIL"],
  });

  // 2. Dispatch a clean plain-text fallback string to your In-App notifications bell feed
  await createNotification({
    userId: input.userId,
    type: "VERIFICATION",
    title: "Verify your email",
    body: getPlainNotificationText.emailVerification(code),
    channels: ["IN_APP"],
  });

  console.info(`[Email Verification] Code for ${input.email}: ${code}`);
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

  await redis.setex(cacheKeys.otp(input.phone, input.purpose), OTP_EXPIRY_SECONDS, code);

  if (input.userId) {
    // SMS and In-App feeds share plain text natively without needing structural layout partitions
    await createNotification({
      userId: input.userId,
      type: "VERIFICATION",
      title: "Your verification code",
      body: getPlainNotificationText.phoneVerification(code),
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
      email: user.email,
      phone: user.phone,
      code,
      purpose: OtpPurpose.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000),
    },
  });

  await redis.setex(cacheKeys.passwordReset(user.id), OTP_EXPIRY_SECONDS, code);

  // Send rich template layout to inbox channel
  await createNotification({
    userId: user.id,
    type: "VERIFICATION",
    title: "Password Reset request",
    body: getHtmlTemplates.passwordReset(code, formatExpiryText(OTP_EXPIRY_SECONDS)),
    channels: ["EMAIL"],
  });

  // Send lightweight copy to mobile lines and app panels
  const alternativeChannels: ("SMS" | "IN_APP")[] = ["IN_APP"];
  if (user.phone) alternativeChannels.push("SMS");

  await createNotification({
    userId: user.id,
    type: "VERIFICATION",
    title: "Password Reset request",
    body: getPlainNotificationText.passwordReset(code),
    channels: alternativeChannels,
  });

  console.info(`[Password Reset] Code for ${email}: ${code}`);
}

export async function resendPasswordResetCode(email: string): Promise<{
  success: true;
  nextAllowedAt: number;
}> {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null, isActive: true },
    select: { id: true },
  });

  const identifier = user?.id ?? normalizedEmail;
  const COOLDOWN_SECONDS = 30;

  const cooldownTtl = await redis.ttl(
    cacheKeys.otpCooldown(identifier, OtpPurpose.PASSWORD_RESET)
  );

  if (cooldownTtl > 0) {
    return {
      success: true,
      nextAllowedAt: Date.now() + cooldownTtl * 1000,
    };
  }

  await redis.setex(
    cacheKeys.otpCooldown(identifier, OtpPurpose.PASSWORD_RESET),
    COOLDOWN_SECONDS,
    String(Date.now() + COOLDOWN_SECONDS * 1000)
  );

  await requestPasswordReset(normalizedEmail);

  return {
    success: true,
    nextAllowedAt: Date.now() + COOLDOWN_SECONDS * 1000,
  };
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
      purpose: OtpPurpose.PASSWORD_RESET,
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
    title: "Password updated successfully",
    body: getHtmlTemplates.passwordUpdated(),
    channels: ["EMAIL"],
  });

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: "Password updated successfully",
    body: getPlainNotificationText.passwordUpdated(),
    channels: ["IN_APP"],
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
    title: "Password Updated",
    body: getHtmlTemplates.changePassword(),
    channels: ["EMAIL"],
  });

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: "Password Updated",
    body: "Your authentication credentials have been modified successfully.",
    channels: ["IN_APP"],
  });
}

export async function verifyOtp(input: {
  phone: string;
  code: string;
  purpose: OtpPurpose;
  userId: string;
}): Promise<void> {
  const cached = await redis.get(cacheKeys.otp(input.phone, input.purpose));

  const record = await prisma.otpRecord.findFirst({
    where: {
      OR: [
        { phone: input.phone },
        { email: input.phone.toLowerCase() }
      ],
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
    ...(input.purpose === OtpPurpose.PHONE_VERIFICATION
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
    ...(input.purpose === OtpPurpose.EMAIL_VERIFICATION
      ? [
          prisma.user.update({
            where: { id: input.userId },
            data: {
              emailVerified: true,
            },
          }),
        ]
      : []),
  ]);

  await redis.del(cacheKeys.otp(input.phone, input.purpose));

  const contentMap: Record<string, string> = {
    PHONE_VERIFICATION: getPlainNotificationText.phoneVerified(),
    PASSWORD_RESET: "Your security identity checkpoint parameters cleared successfully.",
    LOGIN: getPlainNotificationText.loginVerified(),
    EMAIL_VERIFICATION: "Your primary communication line channel verification is complete."
  };

  const textBody = contentMap[input.purpose] || "Verification processed successfully.";

  // Dispatch rich structural summary to Email
  await createNotification({
    userId: input.userId,
    type: "VERIFICATION",
    title: "Verification Complete",
    body: getHtmlTemplates.otpVerificationComplete(input.purpose),
    channels: ["EMAIL"]
  });

  // Dispatch lightweight string to alternate UI views
  await createNotification({
    userId: input.userId,
    type: "VERIFICATION",
    title: "Verification Complete",
    body: textBody,
    channels: ["IN_APP"]
  });
}