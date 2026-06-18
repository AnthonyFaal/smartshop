import { prisma } from "@/lib/db/prisma";
import {
  Prisma,
  type NotificationChannel,
  type NotificationType,
} from "@prisma/client";
import { env } from "@/lib/config/env";
import nodemailer from "nodemailer";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

async function sendEmail(to: string, subject: string, body: string) {
  // In dev/test without SMTP configured, we only log.
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    console.info(`[Email] Would send to ${to}: ${subject}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text: body,
    });
  } catch (err) {
    // Do not fail the auth flow due to mail server issues.
    // Also avoids leaking account existence; the TRPC endpoint should still succeed.
    console.error("[Email] sendMail failed:", err);
  }
}

async function sendSms(to: string, message: string): Promise<void> {
  if (!env.SMS_API_KEY) {
    console.info(`[SMS] Would send to ${to}: ${message}`);
    return;
  }

  // TODO: integrate SMS provider. Keeping current stub.
  console.info(`[SMS] Sent to ${to}`);
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  const channels = input.channels ?? ["IN_APP"];

  for (const channel of channels) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel,
        title: input.title,
        body: input.body,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, phone: true },
  });

  if (!user) return;

  if (channels.includes("EMAIL")) {
    // Email sending failures should not fail the reset-request flow.
    await sendEmail(user.email, input.title, input.body);
  }

  if (channels.includes("SMS") && user.phone) {
    await sendSms(user.phone, `${input.title}: ${input.body}`);
  }
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

