import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import * as authService from "@/server/services/auth.service";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/notifications/service";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getSellerDashboardData } from "@/server/services/seller.service";
import {
  getDefaultSubscriptionOfferings,
  getPlanLimits,
  getPlanOrder,
  normalizeSubscriptionOffering,
} from "@/lib/config/subscriptions";
import { OtpPurpose, PaymentMethod,  SubscriptionPlan } from "@prisma/client";

async function syncSubscriptionOfferings() {
  const defaults = getDefaultSubscriptionOfferings();
  const existingOfferings = await prisma.subscriptionOffering.findMany({
    orderBy: { createdAt: "asc" },
  });

  const existingByTier = new Map<string, typeof existingOfferings[number][]>();
  for (const offering of existingOfferings) {
    const tier = offering.tier;
    const items = existingByTier.get(tier) ?? [];
    items.push(offering);
    existingByTier.set(tier, items);
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

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        phone: z.string().optional(),
        acceptTerms: z.boolean().refine((v) => v, {
          message: "You must accept the Terms of Service",
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { acceptTerms: _, ...registerInput } = input;
      const result = await authService.registerUser({
        ...registerInput,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ip,
      });
      return {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        phone: result.user.phone,
        phoneVerified: result.user.phoneVerified,
        emailVerified: result.user.emailVerified,
        sessionId: result.sessionId,
      };
    }),

  login: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await authService.loginUser({
        ...input,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ip,
      });
      return {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      };
    }),

  logout: protectedProcedure
    .use(withErrorHandling)
    .mutation(async () => {
      await authService.logoutUser();
      return { success: true };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
  if (!ctx.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },

    select: {
      id: true,
      email: true,
      role: true,
      phone: true,

      phoneVerified: true,
      emailVerified: true,

      verificationLevel: true,

      profile: true,

      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },

      trustScore: {
        select: {
          score: true,
        },
      },


      sellerVerification: {
        select: {
          id: true,
          status: true,
          ghanaCardFrontUrl: true,
          selfieUrl: true,
          isFaceVerified: true,
          reviewedBy: true,
          reviewedAt: true,
          rejectionReason: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });


  return user;
}),

  sellerDashboard: protectedProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => getSellerDashboardData(ctx.user.id)),

  subscriptionPlans: protectedProcedure
    .use(withErrorHandling)
    .query(async () => {
      const offerings = await syncSubscriptionOfferings();

      const normalized = offerings
        .map((offering) => normalizeSubscriptionOffering({
          ...offering,
          tier: offering.tier as SubscriptionPlan,
        }))
        .sort((a, b) => getPlanOrder(a.tier) - getPlanOrder(b.tier));

      return { plans: normalized };
    }),

  initializeSubscriptionCheckout: protectedProcedure
    .use(withErrorHandling)
    .input(z.object({ plan: z.nativeEnum(SubscriptionPlan) }))
    .mutation(async ({ input, ctx }) => {
      if (input.plan === SubscriptionPlan.FREE) {
        return {
          success: true,
          redirectUrl: null,
          message: "Free plan is already available by default.",
        };
      }

      const offering = await prisma.subscriptionOffering.findFirst({
        where: { tier: input.plan, isActive: true },
      });

      const currentSubscription = await prisma.subscription.findUnique({
        where: { userId: ctx.user.id },
      });

      if (
        currentSubscription?.plan === input.plan &&
        currentSubscription.status === "ACTIVE"
      ) {
        return {
          success: true,
          redirectUrl: null,
          message: "You already have this plan.",
        };
      }

      const amountGhs = Number(offering?.priceGhs ?? getPlanLimits(input.plan).priceGhs ?? 0);
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const provider = getPaymentProvider(process.env.PAYMENT_PROVIDER);
      const result = await provider.initiate({
        orderId: `sub_${ctx.user.id}_${Date.now()}`,
        amount: Math.round(amountGhs * 100),
        currency: "GHS",
        method: PaymentMethod.CARD,
        customerEmail: ctx.user.email,
        customerPhone: ctx.user.phone ?? undefined,
        metadata: {
          plan: input.plan,
          userId: ctx.user.id,
          purpose: "subscription",
        },
      });

      const nextStatus = result.status === "COMPLETED" ? "ACTIVE" : "TRIALING";

      await prisma.subscription.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          plan: input.plan,
          status: nextStatus,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          providerRef: result.providerRef,
        },
        update: {
          plan: input.plan,
          status: nextStatus,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          providerRef: result.providerRef,
        },
      });

      await createNotification({
        userId: ctx.user.id,
        type: "SYSTEM",
        title: "Subscription checkout started",
        body: "Your subscription upgrade request is being processed.",
        channels: ["IN_APP"],
      });

      return {
        success: true,
        redirectUrl: result.redirectUrl ?? null,
        providerRef: result.providerRef,
        message: nextStatus === "ACTIVE" ? "Your plan is now active." : "Complete payment to activate your plan.",
      };
    }),

  // ────────────────────────────────────────────────────────────────────────────
  // Seller verification (new automated flow)
  // NOTE: Production OCR/liveness/face matching logic will be
  // implemented in dedicated services. For now these endpoints are updated
  // Verification is based on identity documents and selfie review.

sellerVerificationUpsertGhanaCardImage: protectedProcedure
  .use(withErrorHandling)
  .input(
    z.object({
      ghanaCardFrontUrl: z.string().url().max(2048),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user.id;

    await prisma.sellerVerification.upsert({
      where: { userId },
      create: {
        userId,
        ghanaCardFrontUrl: input.ghanaCardFrontUrl,
        selfieUrl: "",
        isFaceVerified: false,
        status: "PENDING",
      },
      update: {
        ghanaCardFrontUrl: input.ghanaCardFrontUrl,
        status: "PENDING",
      },
    });

    return { success: true };
  }),

sellerVerificationUpsertSelfieFrame: protectedProcedure
  .use(withErrorHandling)
  .input(
    z.object({
      selfieUrl: z.string().url().max(2048),
    })
  )
  .mutation(async ({ input, ctx }) => {
    await prisma.sellerVerification.upsert({
      where: { userId: ctx.user.id },
      create: {
        userId: ctx.user.id,
        ghanaCardFrontUrl: "",
        selfieUrl: input.selfieUrl,
        isFaceVerified: false,
        status: "PENDING",
      },
      update: {
        selfieUrl: input.selfieUrl,
        status: "PENDING",
      },
    });

    return { success: true };
  }),

// Seller verification must not collect or update store location.
// The previous location-based endpoint is removed by design.


  sendOtp: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        phone: z
          .string()
          .regex(/^\+233[0-9]{9}$/, "Use Ghana format: +233XXXXXXXXX"),
        purpose: z.nativeEnum(OtpPurpose),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await authService.sendOtp({
        phone: input.phone,
        purpose: input.purpose,
        userId: ctx.user.id,
      });
      return { success: true };
    }),
    

  verifyOtp: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        phone: z.string(),
        code: z.string().length(6),
        purpose: z.nativeEnum(OtpPurpose), // Fixed: Fully synced with all 4 schema enums
      })
    )
    .mutation(async ({ input, ctx }) => {
      await authService.verifyOtp({
        phone: input.phone,
        code: input.code,
        purpose: input.purpose,
        userId: ctx.user.id,
      });
      return { success: true };
    }),

  sendEmailVerification: protectedProcedure
    .use(withErrorHandling)
    .mutation(async ({ ctx }) => {
      await authService.sendEmailVerification({
        userId: ctx.user.id,
        email: ctx.user.email,
      });
      return { success: true };
    }),

  // Allow verifying email codes from the public flow (user may be unauthenticated)
  verifyEmailOtp: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({ where: { email: input.email.toLowerCase(), deletedAt: null } });
      if (!user) throw new Error("Invalid verification request");

      await authService.verifyOtp({
        phone: input.email,
        code: input.code,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        userId: user.id,
      });
      return { success: true };
    }),

  // Public resend for email verification (does not reveal account existence)
  resendEmailVerification: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({ where: { email: input.email.toLowerCase(), deletedAt: null } });
      if (!user) return { success: true };

      await authService.sendEmailVerification({ userId: user.id, email: user.email });
      return { success: true };
    }),

  forgotPassword: publicProcedure
    .use(withErrorHandling)
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      await authService.requestPasswordReset(input.email);
      return {
        success: true,
        message:
          "If an account exists with that email, a reset code has been sent.",
      };
    }),

  resetPassword: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      await authService.resetPassword(input);
      return { success: true };
    }),

  resendResetCode: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await authService.resendPasswordResetCode(input.email);
      return result;
    }),

  changePassword: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await authService.changePassword({
        userId: ctx.user.id,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      return { success: true };
    }),
});
