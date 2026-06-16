import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import { complete, getSystemPrompt } from "@/lib/ai/provider";
import { prisma } from "@/lib/db/prisma";
import { redis, cacheKeys } from "@/lib/redis/client";
import { Errors } from "@/server/errors";
import { AI_TIER_LIMITS } from "@/lib/config/subscriptions";
import type { AiFeature } from "@prisma/client";

async function checkAiQuota(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan ?? "FREE";
  const tier =
    plan === "FREE"
      ? "basic"
      : plan === "STARTER"
      ? "standard"
      : "advanced";

  const limits = AI_TIER_LIMITS[tier];

  const today = new Date().toISOString().split("T")[0];
  const key = cacheKeys.aiUsage(userId, today);

  try {
    const cached = await redis.get(key);
    const usage = cached ? parseInt(cached, 10) : 0;

    if (usage >= limits.dailyRequests) {
      throw Errors.subscriptionLimit(
        "Daily AI request limit reached. Upgrade your plan for more."
      );
    }

    // SAFE atomic update (Upstash-friendly)
    await redis.setex(key, 86400, String(usage + 1));
  } catch (err) {
    // IMPORTANT: do NOT crash request if Redis fails
    console.error("[Redis AI quota error]", err);

    // fallback: allow request (fail-open strategy)
    return;
  }
}

async function logAiUsage(
  userId: string,
  feature: AiFeature,
  result: Awaited<ReturnType<typeof complete>>
) {
  await prisma.aiUsageLog.create({
    data: {
      userId,
      feature,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.totalTokens,
      model: result.model,
    },
  });
}

export const aiRouter = createTRPCRouter({
  smartSearch: protectedProcedure
    .use(withErrorHandling)
    .input(z.object({ query: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      await checkAiQuota(ctx.user.id);
      const result = await complete(
        getSystemPrompt("SMART_SEARCH"),
        `Parse this search query for a Ghana marketplace: "${input.query}". Return JSON with: keywords, category, minPrice, maxPrice, sortBy.`
      );
      await logAiUsage(ctx.user.id, "SMART_SEARCH", result);
      return { result: result.content };
    }),

  generateListing: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productName: z.string(),
        category: z.string(),
        condition: z.string().optional(),
        features: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await checkAiQuota(ctx.user.id);
      const result = await complete(
        getSystemPrompt("LISTING_GENERATION"),
        `Generate a product listing for: ${JSON.stringify(input)}. Include title, description, suggested tags, and price range in GHS.`
      );
      await logAiUsage(ctx.user.id, "LISTING_GENERATION", result);
      return { result: result.content };
    }),

  pricingSuggestion: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productName: z.string(),
        category: z.string(),
        condition: z.string(),
        competitorPrices: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await checkAiQuota(ctx.user.id);
      const result = await complete(
        getSystemPrompt("PRICING_SUGGESTION"),
        `Suggest pricing in GHS for: ${JSON.stringify(input)}`
      );
      await logAiUsage(ctx.user.id, "PRICING_SUGGESTION", result);
      return { result: result.content };
    }),

  moderateListing: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        price: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await checkAiQuota(ctx.user.id);
      const result = await complete(
        getSystemPrompt("LISTING_MODERATION"),
        `Review this listing for policy violations: ${JSON.stringify(input)}. Return: approved (boolean), issues (array), riskScore (0-100).`
      );
      await logAiUsage(ctx.user.id, "LISTING_MODERATION", result);
      return { result: result.content };
    }),

  usageStats: protectedProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayUsage, totalUsage] = await Promise.all([
        prisma.aiUsageLog.aggregate({
          where: { userId: ctx.user.id, createdAt: { gte: today } },
          _count: true,
          _sum: { totalTokens: true },
        }),
        prisma.aiUsageLog.aggregate({
          where: { userId: ctx.user.id },
          _count: true,
          _sum: { totalTokens: true },
        }),
      ]);

      return {
        todayRequests: todayUsage._count,
        todayTokens: todayUsage._sum.totalTokens ?? 0,
        totalRequests: totalUsage._count,
        totalTokens: totalUsage._sum.totalTokens ?? 0,
      };
    }),
});
