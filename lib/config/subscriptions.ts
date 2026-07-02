import { SubscriptionPlan } from "@prisma/client";

export const SUBSCRIPTION_PLAN_ORDER: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.STARTER]: 1,
  [SubscriptionPlan.BUSINESS]: 2,
  [SubscriptionPlan.ENTERPRISE]: 3,
};

export const SUBSCRIPTION_PLAN_META: Record<
  SubscriptionPlan,
  {
    label: string;
    description: string;
    badge: string;
    accent: string;
    isPaid: boolean;
  }
> = {
  [SubscriptionPlan.FREE]: {
    label: "Free",
    description: "The default plan for new sellers.",
    badge: "Default",
    accent: "zinc",
    isPaid: false,
  },
  [SubscriptionPlan.STARTER]: {
    label: "Starter Seller",
    description: "A simple paid upgrade for new sellers.",
    badge: "Most popular",
    accent: "emerald",
    isPaid: true,
  },
  [SubscriptionPlan.BUSINESS]: {
    label: "Pro Seller",
    description: "For active sellers who want more visibility and tools.",
    badge: "Best value",
    accent: "violet",
    isPaid: true,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    label: "Business Seller",
    description: "The full premium plan for growing businesses.",
    badge: "Premium",
    accent: "amber",
    isPaid: true,
  },
};

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

export function getPlanMeta(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PLAN_META[plan];
}

export function getPlanOrder(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PLAN_ORDER[plan];
}
