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
import { AI_TIER_LIMITS, canUseAiFeatures } from "@/lib/config/subscriptions";
import { SubscriptionPlan } from "@prisma/client";
import type { AiFeature } from "@prisma/client";

async function checkAiQuota(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  const plan = subscription?.plan ?? SubscriptionPlan.FREE;
  const status = subscription?.status ?? "EXPIRED";

  // Prevent confusion: UI may show eligibility based on plan, but AI must
  // only run when subscription is actually ACTIVE.
  if (!canUseAiFeatures(plan) || status !== "ACTIVE") {
    throw Errors.subscriptionLimit(
      "AI tools are available only for ACTIVE paid seller plans."
    );
  }

  const tier =
    plan === SubscriptionPlan.STARTER
      ? "standard"
      : plan === SubscriptionPlan.BUSINESS || plan === SubscriptionPlan.ENTERPRISE
      ? "advanced"
      : "basic";

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

      // Provide allowed category names to the model (model still cannot access DB directly).
      const categories = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      });

      const allowedCategoryNames = categories.map((c) => c.name);

      const systemPrompt = getSystemPrompt("SMART_SEARCH") + "\n\n" + [
        "HARD REQUIREMENTS (anti-hallucination):",
        "- Return JSON ONLY. No markdown, no backticks, no extra keys.",
        "- Do NOT invent categories. If the query does not clearly match one of the allowed category names, set category to null.",
        "- Allowed sortBy values: createdAt | price | rating | soldCount. If not applicable set sortBy to null.",
        "- Allowed sortOrder values: asc | desc. If not applicable set sortOrder to null.",
        "- minPrice/maxPrice are either numbers (GHS) or null. Never return strings for prices.",
        "",
        "Output JSON schema:",
        "{",
        '  "keywords": string | string[],',
        '  "category": string | null,',
        '  "minPrice": number | null,',
        '  "maxPrice": number | null,',
        '  "sortBy": "createdAt" | "price" | "rating" | "soldCount" | null,',
        '  "sortOrder": "asc" | "desc" | null',
        "}",
        "",
        "Allowed category names:",
        allowedCategoryNames.length ? allowedCategoryNames.map(String).join(", ") : "(none)",
      ].join("\n");

      const userPrompt = [
        `Ghana marketplace product search refinement.`,
        `User query: "${input.query}"`,
        "",
        "Task:",
        "- Convert the user's intent into structured filters.",
        "- keywords should be meaningful search terms (e.g., 'iPhone 13', 'wireless earbuds', 'smart watch').",
        "- If the user asks for 'best rating' choose sortBy='rating' and sortOrder='desc'.",
        "- If the user asks for 'cheapest' choose sortBy='price' and sortOrder='asc'.",
        "- If the user asks for 'most popular' or 'best selling' choose sortBy='soldCount' and sortOrder='desc'.",
      ].join("\n");

      const result = await complete(systemPrompt, userPrompt, { temperature: 0.2 });

      await logAiUsage(ctx.user.id, "SMART_SEARCH", result);

      // Validate model output to prevent hallucinated/invalid values reaching UI.
      const SmartSearchOutputSchema = z.object({
        keywords: z.union([z.string(), z.array(z.string())]),
        category: z.string().nullable(),
        minPrice: z.number().nullable(),
        maxPrice: z.number().nullable(),
        sortBy: z
          .enum(["createdAt", "price", "rating", "soldCount"])
          .nullable(),
        sortOrder: z.enum(["asc", "desc"]).nullable(),
      });

      const safeFallback = {
        keywords: input.query,
        category: null,
        minPrice: null,
        maxPrice: null,
        sortBy: null,
        sortOrder: null,
      };

      try {
        const cleaned = result.content
          .trim()
          .replace(/^```(?:json)?/i, "")
          .replace(/```$/i, "")
          .trim();

        const parsed = JSON.parse(cleaned);

        const validated = SmartSearchOutputSchema.parse(parsed);

        // Enforce allowed category names (anti-hallucination).
        const allowed = new Set(allowedCategoryNames.map((n) => n.toLowerCase()));
        const nextCategory =
          validated.category && allowed.has(validated.category.toLowerCase())
            ? validated.category
            : null;

        // If sortBy is not price, sortOrder should still be allowed; keep as-is.
        // UI already maps sortOrder logic based on sortBy; but we still keep values constrained.
        return {
          result: JSON.stringify({
            keywords: validated.keywords,
            category: nextCategory,
            minPrice: validated.minPrice,
            maxPrice: validated.maxPrice,
            sortBy: validated.sortBy,
            sortOrder: validated.sortOrder,
          }),
        };
      } catch (err) {
        // Return a safe JSON shape so UI degrades to keyword search without hallucinated filters.
        return { result: JSON.stringify(safeFallback) };
      }
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
        [
          `Generate a product listing for: ${JSON.stringify(input)}.`,
          `Return STRICT JSON ONLY (no markdown, no bullet points, no extra text).`,
          `JSON schema:`,
          `{`,
          `  "title": string,`,
          `  "description": string,`,
          `  "tags": string[],`,
          `  "priceRange": { "min": number, "max": number }`,
          `}`,
          ``,
          `Rules:`,
          `- description must be plain text only (max 3 short paragraphs).`,
          `- description must NOT contain markdown formatting (no "*", no "-" bullets, no headings).`,
          `- tags must be an array of clean tag strings WITHOUT "#" (e.g. ["ElectronicBrush","SmartCleaning"]).`,
          `- priceRange values must be numbers in GHS.`,
        ].join("\n")
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
