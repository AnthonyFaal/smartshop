import { SubscriptionPlan } from "@prisma/client";

export const SUBSCRIPTION_LIMITS = {
  [SubscriptionPlan.FREE]: {
    maxProducts: 5,
    aiTier: "basic" as const,
    analytics: false,
    promotions: false,
    multiStore: false,
    teamManagement: false,
    apiAccess: false,
    priceGhs: 0,
  },
  [SubscriptionPlan.STARTER]: {
    maxProducts: 200,
    aiTier: "standard" as const,
    analytics: true,
    promotions: false,
    multiStore: false,
    teamManagement: false,
    apiAccess: false,
    priceGhs: 49,
  },
  [SubscriptionPlan.BUSINESS]: {
    maxProducts: Infinity,
    aiTier: "advanced" as const,
    analytics: true,
    promotions: true,
    multiStore: false,
    teamManagement: false,
    apiAccess: false,
    priceGhs: 149,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    maxProducts: Infinity,
    aiTier: "advanced" as const,
    analytics: true,
    promotions: true,
    multiStore: true,
    teamManagement: true,
    apiAccess: true,
    priceGhs: 499,
  },
} as const;

export type AiTier = (typeof SUBSCRIPTION_LIMITS)[SubscriptionPlan]["aiTier"];

export const AI_TIER_LIMITS: Record<
  AiTier,
  { dailyRequests: number; maxTokensPerRequest: number }
> = {
  basic: { dailyRequests: 10, maxTokensPerRequest: 1000 },
  standard: { dailyRequests: 50, maxTokensPerRequest: 2000 },
  advanced: { dailyRequests: 500, maxTokensPerRequest: 4096 },
};

export function getPlanLimits(plan: SubscriptionPlan) {
  return SUBSCRIPTION_LIMITS[plan];
}
