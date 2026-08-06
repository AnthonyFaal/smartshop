import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { calculateTrustScore } from "@/server/services/trust.service";
import { createNotification } from "@/lib/notifications/service";
import { getPlanLimits } from "@/lib/config/subscriptions";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

async function syncSubscriptionOfferingsForAdmin() {
  const defaults = (await import("@/lib/config/subscriptions")).getDefaultSubscriptionOfferings();
  const existingOfferings = await prisma.subscriptionOffering.findMany({
    orderBy: { createdAt: "asc" },
  });

  const existingByTier = new Map<string, typeof existingOfferings[number][]>();
  for (const offering of existingOfferings) {
    const items = existingByTier.get(offering.tier) ?? [];
    items.push(offering);
    existingByTier.set(offering.tier, items);
  }

  for (const defaultOffering of defaults) {
    const tier = defaultOffering.tier as SubscriptionPlan;
    const matches = existingByTier.get(tier) ?? [];

    if (matches.length > 1) {
      const [primary, ...duplicates] = matches.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      await Promise.all(
        duplicates.map((offering) =>
          prisma.subscriptionOffering.delete({ where: { id: offering.id } })
        )
      );

      existingByTier.set(tier, [primary]);
    }

    if (!existingByTier.get(tier)?.length) {
      await prisma.subscriptionOffering.create({
        data: {
          tier,
          name: defaultOffering.name,
          version: defaultOffering.version,
          priceGhs: defaultOffering.priceGhs,
          maxProducts: defaultOffering.maxProducts,
          aiTier: defaultOffering.aiTier,
          analytics: defaultOffering.analytics,
          promotions: defaultOffering.promotions,
          multiStore: defaultOffering.multiStore,
          teamManagement: defaultOffering.teamManagement,
          apiAccess: defaultOffering.apiAccess,
          freeTrialDays: defaultOffering.freeTrialDays,
          aiDailyRequests: defaultOffering.aiDailyRequests,
          aiMaxTokensPerRequest: defaultOffering.aiMaxTokensPerRequest,
          isActive: defaultOffering.isActive,
        },
      });
    }
  }

  const offerings = await prisma.subscriptionOffering.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return offerings.filter(
    (offering, index, all) => all.findIndex((item) => item.tier === offering.tier) === index
  );
}

export const adminRouter = createTRPCRouter({
  subscriptionOfferings: adminProcedure
    .use(withErrorHandling)
    .query(async () => {
      const offerings = await syncSubscriptionOfferingsForAdmin();

      return {
        offerings: offerings.map((offering) => ({
          ...offering,
          priceGhs: Number(offering.priceGhs),
        })),
      };
    }),

  upsertSubscriptionOffering: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        id: z.string().uuid().optional(),
        tier: z.nativeEnum(SubscriptionPlan),
        name: z.string().min(1),
        version: z.string().min(1),
        priceGhs: z.number().min(0),
        maxProducts: z.number().nullable().optional(),
        aiTier: z.string().min(1),
        analytics: z.boolean(),
        promotions: z.boolean(),
        multiStore: z.boolean(),
        teamManagement: z.boolean(),
        apiAccess: z.boolean(),
        freeTrialDays: z.number().int().min(0),
        aiDailyRequests: z.number().int().min(0),
        aiMaxTokensPerRequest: z.number().int().min(0),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const payload = {
        tier: input.tier,
        name: input.name,
        version: input.version,
        priceGhs: input.priceGhs,
        maxProducts: input.maxProducts ?? 0,
        aiTier: input.aiTier,
        analytics: input.analytics,
        promotions: input.promotions,
        multiStore: input.multiStore,
        teamManagement: input.teamManagement,
        apiAccess: input.apiAccess,
        freeTrialDays: input.freeTrialDays,
        aiDailyRequests: input.aiDailyRequests,
        aiMaxTokensPerRequest: input.aiMaxTokensPerRequest,
        isActive: input.isActive,
      };

      const offering = input.id
        ? await prisma.subscriptionOffering.update({
            where: { id: input.id },
            data: payload,
          })
        : await prisma.subscriptionOffering.create({ data: payload });

      return { offering };
    }),

  mySubscription: adminProcedure
    .use(withErrorHandling)
    .input(z.object({
      userId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: input.userId },
      });
      return subscription;
    }),

  subscriptionList: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        status: z
          .enum([
            "ACTIVE",
            "PAST_DUE",
            "CANCELLED",
            "EXPIRED",
            "TRIALING",
          ])
          .optional(),
        plan: z
          .enum([
            "FREE",
            "STARTER",
            "BUSINESS",
            "ENTERPRISE",
          ])
          .optional(),
        limit: z.number().min(1).max(50).optional(),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ input }) => {
      const limit = input.limit ?? 20;
      const items = await prisma.subscription.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.plan ? { plan: input.plan } : {}),
        },
        take: limit + 1,
        ...(input.cursor
          ? { cursor: { id: input.cursor }, skip: 1 }
          : {}),
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  upsertSubscription: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        userId: z.string().uuid(),
        plan: z.nativeEnum(SubscriptionPlan).optional(),
        status: z.nativeEnum(SubscriptionStatus).optional(),
        currentPeriodStart: z.date().optional(),
        currentPeriodEnd: z.date().optional(),
        cancelAtPeriodEnd: z.boolean().optional(),
        providerRef: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.subscription.findUnique({
        where: { userId: input.userId },
      });

      const now = new Date();
      const next = {
        plan: input.plan ?? existing?.plan ?? "FREE",
        status: input.status ?? existing?.status ?? "ACTIVE",
        currentPeriodStart: input.currentPeriodStart ?? existing?.currentPeriodStart ?? now,
        currentPeriodEnd:
          input.currentPeriodEnd ?? existing?.currentPeriodEnd ?? now,
        cancelAtPeriodEnd:
          input.cancelAtPeriodEnd ?? existing?.cancelAtPeriodEnd ?? false,
        providerRef: input.providerRef ?? existing?.providerRef ?? null,
      };

      await prisma.subscription.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          ...next,
        },
        update: {
          ...next,
        },
      });

      return { success: true };
    }),

  updateSubscription: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        subscriptionId: z.string().uuid(),
        plan: z.nativeEnum(SubscriptionPlan).optional(),
        status: z.nativeEnum(SubscriptionStatus).optional(),
        currentPeriodStart: z.date().optional(),
        currentPeriodEnd: z.date().optional(),
        cancelAtPeriodEnd: z.boolean().optional(),
        providerRef: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          ...(input.plan ? { plan: input.plan } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.currentPeriodStart
            ? { currentPeriodStart: input.currentPeriodStart }
            : {}),
          ...(input.currentPeriodEnd
            ? { currentPeriodEnd: input.currentPeriodEnd }
            : {}),
          ...(input.cancelAtPeriodEnd !== undefined
            ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd }
            : {}),
          ...(input.providerRef !== undefined
            ? { providerRef: input.providerRef }
            : {}),
        },
      });

      const sub = await prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: { user: true },
      });

      if (sub) {
        await createNotification({
          userId: sub.userId,
          type: "SYSTEM",
          title: "Subscription Updated",
          body: "Your seller subscription has been updated by the admin team.",
          channels: ["IN_APP"],
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          entityType: "Subscription",
          entityId: input.subscriptionId,
          newValues: {
            ...input,
          },
        },
      });

      return { success: true };
    }),

  cancelSubscription: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: input.userId },
      });
      if (!sub) throw Errors.notFound("Subscription");

      const updated = await prisma.subscription.update({
        where: { userId: input.userId },
        data: {
          cancelAtPeriodEnd: true,
          ...(sub.status === "ACTIVE" ? { status: "PAST_DUE" } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          entityType: "Subscription",
          entityId: updated.id,
          newValues: { cancelAtPeriodEnd: true, reason: input.reason ?? null },
        },
      });

      await createNotification({
        userId: updated.userId,
        type: "SYSTEM",
        title: "Subscription Cancellation Scheduled",
        body:
          input.reason ??
          "Your subscription will be cancelled at the end of the current period.",
        channels: ["IN_APP"],
      });

      return { success: true };
    }),

  activateSubscription: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        userId: z.string().uuid(),
        plan: z.nativeEnum(SubscriptionPlan).optional(),
        periodStart: z.date().optional(),
        periodEnd: z.date().optional(),
        providerRef: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: input.userId },
      });

      const now = new Date();
      const next = await prisma.subscription.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          plan: input.plan ?? "FREE",
          status: "ACTIVE",
          currentPeriodStart: input.periodStart ?? now,
          currentPeriodEnd: input.periodEnd ?? now,
          cancelAtPeriodEnd: false,
          providerRef: input.providerRef ?? null,
        },
        update: {
          plan: input.plan ?? sub?.plan ?? "FREE",
          status: "ACTIVE",
          currentPeriodStart: input.periodStart ?? sub?.currentPeriodStart ?? now,
          currentPeriodEnd: input.periodEnd ?? sub?.currentPeriodEnd ?? now,
          cancelAtPeriodEnd: false,
          providerRef:
            input.providerRef !== undefined
              ? input.providerRef
              : sub?.providerRef ?? null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "APPROVE",
          entityType: "Subscription",
          entityId: next.id,
          newValues: { activated: true },
        },
      });

      await createNotification({
        userId: next.userId,
        type: "SYSTEM",
        title: "Subscription Activated",
        body: "Your seller subscription is now active.",
        channels: ["IN_APP"],
      });

      return { success: true };
    }),

  expireSubscription: adminProcedure
    .use(withErrorHandling)
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: input.userId },
      });
      if (!sub) throw Errors.notFound("Subscription");

      const updated = await prisma.subscription.update({
        where: { userId: input.userId },
        data: { status: "EXPIRED", cancelAtPeriodEnd: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          entityType: "Subscription",
          entityId: updated.id,
          newValues: { expired: true },
        },
      });

      await createNotification({
        userId: updated.userId,
        type: "SYSTEM",
        title: "Subscription Expired",
        body: "Your seller subscription has expired.",
        channels: ["IN_APP"],
      });

      return { success: true };
    }),

  subscriptionLimitsForPlan: adminProcedure
    .use(withErrorHandling)
    .input(z.object({ plan: z.nativeEnum(SubscriptionPlan) }))
    .query(async ({ input }) => {
      return getPlanLimits(input.plan);
    }),

  dashboard: adminProcedure.use(withErrorHandling).query(async () => {
    const [
      totalUsers,
      totalSellers,
      pendingVerifications,
      totalProducts,
      totalOrders,
      openDisputes,
      revenue,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: "SELLER", deletedAt: null } }),
      prisma.sellerVerification.count({
        where: {
          status: { in: ["PENDING", "UNDER_REVIEW"] },
        },
      }),
      prisma.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.order.count(),
      prisma.dispute.count({ where: { status: "OPEN" } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      totalSellers,
      pendingVerifications,
      totalProducts,
      totalOrders,
      openDisputes,
      totalRevenue: revenue._sum.amount ?? 0,
    };
  }),

  sellerQueue: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        status: z
          .enum([
            "PENDING",
            "UNDER_REVIEW",
            "APPROVED",
            "REJECTED",
            "SUSPENDED",
          ])
          .optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).optional(),
      })
    )
    .query(async ({ input }) => {
      const limit = input.limit ?? 20;
      const reviewStatuses: Array<"PENDING" | "UNDER_REVIEW"> = [
        "PENDING",
        "UNDER_REVIEW",
      ];
      const items = await prisma.sellerVerification.findMany({
        where: input.status
          ? { status: input.status }
          : { status: { in: reviewStatuses } },
        take: limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              phoneVerified: true,
              profile: true,
              trustScore: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  sellerVerificationById: adminProcedure
    .use(withErrorHandling)
    .input(z.object({ verificationId: z.string().uuid() }))
    .query(async ({ input }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              phoneVerified: true,
              profile: true,
              trustScore: true,
            },
          },
          // Note: we don’t have per-step models; decision history is the audit log.
        },
      });

      if (!verification) throw Errors.notFound("Verification");

      const audit = await prisma.auditLog.findMany({
        where: {
          entityType: "SellerVerification",
          entityId: verification.id,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return { verification, audit };
    }),

  approveGhanaCard: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      // Best-effort consistency with current schema (single status field):
      // approveGhanaCard sets UNDER_REVIEW to indicate partial progress.
      await prisma.sellerVerification.update({
        where: { id: input.verificationId },
        data: {
          status: "UNDER_REVIEW",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          notes: input.notes,
        },
      });

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Ghana Card Review Approved",
        body: "Your Ghana Card has been approved. Next, our team will review the rest of your verification.",
        channels: ["IN_APP", "EMAIL", "SMS"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "APPROVE",
          entityType: "SellerVerification",
          entityId: input.verificationId,
          newValues: { step: "GHANA_CARD", notes: input.notes ?? null },
        },
      });

      return { success: true };
    }),

  rejectGhanaCard: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.sellerVerification.update({
        where: { id: input.verificationId },
        data: {
          status: "REJECTED",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.reason,
        },
      });

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Ghana Card Review Rejected",
        body: input.reason,
        channels: ["IN_APP", "EMAIL"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "REJECT",
          entityType: "SellerVerification",
          entityId: input.verificationId,
          newValues: { step: "GHANA_CARD", reason: input.reason },
        },
      });

      return { success: true };
    }),

  requestGhanaCardResubmission: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      // Best-effort with current schema: reset overall to PENDING.
      await prisma.sellerVerification.update({
        where: { id: input.verificationId },
        data: {
          status: "PENDING",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.reason,
          notes: null,
        },
      });

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Resubmit Ghana Card Required",
        body: input.reason,
        channels: ["IN_APP", "EMAIL"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          entityType: "SellerVerification",
          entityId: input.verificationId,
          newValues: { step: "GHANA_CARD", resubmissionReason: input.reason },
        },
      });

      return { success: true };
    }),

  approveGpsLocation: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.sellerVerification.update({
        where: { id: input.verificationId },
        data: {
          status: "UNDER_REVIEW",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          notes: input.notes,
        },
      });

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Seller verification approved",
        body: "Your seller verification has been approved. Your store will be reviewed for VERIFIED status.",
        channels: ["IN_APP", "EMAIL", "SMS"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "APPROVE",
          entityType: "SellerVerification",
          entityId: input.verificationId,
        newValues: { step: "SELLER_VERIFICATION", notes: input.notes ?? null },
        },
      });

      return { success: true };
    }),

  rejectGpsLocation: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.sellerVerification.update({
        where: { id: input.verificationId },
        data: {
          status: "REJECTED",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.reason,
        },
      });

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Seller verification rejected",
        body: input.reason,
        channels: ["IN_APP", "EMAIL"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "REJECT",
          entityType: "SellerVerification",
          entityId: input.verificationId,
        newValues: { step: "SELLER_VERIFICATION", reason: input.reason },
        },
      });

      return { success: true };
    }),

  requestGpsLocationResubmission: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.sellerVerification.update({
        where: { id: input.verificationId },
        data: {
          status: "PENDING",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.reason,
          notes: null,
        },
      });

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Seller verification resubmission required",
        body: input.reason,
        channels: ["IN_APP", "EMAIL"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "UPDATE",
          entityType: "SellerVerification",
          entityId: input.verificationId,
          newValues: {
            step: "SELLER_VERIFICATION",
            resubmissionReason: input.reason,
          },
        },
      });

      return { success: true };
    }),

  approveSeller: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.$transaction([
        prisma.sellerVerification.update({
          where: { id: input.verificationId },
          data: {
            status: "APPROVED",
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            notes: input.notes,
          },
        }),
        prisma.user.update({
          where: { id: verification.userId },
          data: {
            role: "SELLER",
            verificationLevel: "TRUSTED_SELLER",
          },
        }),
        prisma.store.updateMany({
          where: { ownerId: verification.userId, deletedAt: null },
          data: { verificationStatus: "VERIFIED", verifiedAt: new Date(), verifiedBy: ctx.user.id },
        }),
      ]);

      await calculateTrustScore(verification.userId);

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Seller Verification Approved",
        body: "Congratulations! Your seller account has been approved.",
        channels: ["IN_APP", "EMAIL", "SMS"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "APPROVE",
          entityType: "SellerVerification",
          entityId: input.verificationId,
        },
      });

      return { success: true };
    }),

  rejectSeller: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.$transaction([
        prisma.sellerVerification.update({
          where: { id: input.verificationId },
          data: {
            status: "REJECTED",
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            rejectionReason: input.reason,
          },
        }),
        prisma.store.updateMany({
          where: { ownerId: verification.userId, deletedAt: null },
          data: { verificationStatus: "REJECTED", verifiedAt: null, verifiedBy: null },
        }),
      ]);

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Seller Verification Rejected",
        body: input.reason,
        channels: ["IN_APP", "EMAIL"],
      });

      return { success: true };
    }),

  suspendUser: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedReason: input.reason,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "SUSPEND",
          entityType: "User",
          entityId: input.userId,
          newValues: { reason: input.reason },
        },
      });

      return { success: true };
    }),

  moderateProduct: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),
        action: z.enum(["SUSPEND", "ACTIVATE", "ARCHIVE"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const statusMap = {
        SUSPEND: "SUSPENDED" as const,
        ACTIVATE: "ACTIVE" as const,
        ARCHIVE: "ARCHIVED" as const,
      };

      await prisma.product.update({
        where: { id: input.productId },
        data: { status: statusMap[input.action] },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: input.action === "ACTIVATE" ? "UPDATE" : "SUSPEND",
          entityType: "Product",
          entityId: input.productId,
          newValues: { action: input.action, reason: input.reason },
        },
      });

      return { success: true };
    }),
});
