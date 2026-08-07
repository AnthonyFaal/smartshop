import { SubscriptionPlan } from "@prisma/client";

/**
 * SINGLE SOURCE OF TRUTH (prevents enum iteration bugs)
 */
export const ALL_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  SubscriptionPlan.FREE,
  SubscriptionPlan.STARTER,
  SubscriptionPlan.BUSINESS,
  SubscriptionPlan.ENTERPRISE,
];

/**
 * PLAN ORDERING (UI + upgrade logic)
 */
export const SUBSCRIPTION_PLAN_ORDER: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.STARTER]: 1,
  [SubscriptionPlan.BUSINESS]: 2,
  [SubscriptionPlan.ENTERPRISE]: 3,
};

/**
 * UI METADATA (what users actually see)
 */
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

/**
 * PLAN LIMITS (business rules)
 */
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
    maxProducts: 50,
    aiTier: "standard" as const,
    analytics: true,
    promotions: false,
    multiStore: false,
    teamManagement: false,
    apiAccess: false,
    priceGhs: 49,
  },

  [SubscriptionPlan.BUSINESS]: {
    maxProducts: 150,
    aiTier: "advanced" as const,
    analytics: true,
    promotions: true,
    multiStore: false,
    teamManagement: false,
    apiAccess: false,
    priceGhs: 149,
  },

  [SubscriptionPlan.ENTERPRISE]: {
    maxProducts: 10000000,
    aiTier: "advanced" as const,
    analytics: true,
    promotions: true,
    multiStore: true,
    teamManagement: true,
    apiAccess: true,
    priceGhs: 499,
  },
} as const;

/**
 * AI TIER LIMITS
 */
export type AiTier =
  (typeof SUBSCRIPTION_LIMITS)[SubscriptionPlan]["aiTier"];

export const AI_TIER_LIMITS: Record<
  AiTier,
  { dailyRequests: number; maxTokensPerRequest: number }
> = {
  basic: {
    dailyRequests: 10,
    maxTokensPerRequest: 1000,
  },
  standard: {
    dailyRequests: 50,
    maxTokensPerRequest: 2000,
  },
  advanced: {
    dailyRequests: 500,
    maxTokensPerRequest: 4096,
  },
};

/**
 * HELPERS
 */
export function getPlanLimits(plan: SubscriptionPlan) {
  return SUBSCRIPTION_LIMITS[plan];
}

export function getPlanMeta(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PLAN_META[plan];
}

export function getPlanOrder(plan: SubscriptionPlan) {
  return SUBSCRIPTION_PLAN_ORDER[plan];
}

export function formatMaxProductsDisplay(value: number | null | undefined) {
  if (value === null || value === undefined) return "Infinity";
  if (value >= 1000000) return "Infinity";
  return String(value);
}

export function canUseAiFeatures(plan: SubscriptionPlan) {
  return plan !== SubscriptionPlan.FREE;
}

export function normalizeSubscriptionOffering(offering: {
  tier: SubscriptionPlan;
  name?: string | null;
  priceGhs?: number | string | null | { toNumber(): number };
  maxProducts?: number | null;
  aiTier?: string | null;
  analytics?: boolean | null;
  promotions?: boolean | null;
  multiStore?: boolean | null;
  teamManagement?: boolean | null;
  apiAccess?: boolean | null;
  freeTrialDays?: number | null;
  aiDailyRequests?: number | null;
  aiMaxTokensPerRequest?: number | null;
  isActive?: boolean | null;
}) {
  const plan = offering.tier;
  const limits = getPlanLimits(plan);
  const meta = getPlanMeta(plan);

  const maxProducts = offering.maxProducts === null ? null : offering.maxProducts ?? limits.maxProducts ?? null;

  return {
    tier: plan,
    name: offering.name ?? meta.label,
    description: meta.description,
    badge: meta.badge,
    accent: meta.accent,
    isPaid: meta.isPaid,
    priceGhs: Number(offering.priceGhs ?? limits.priceGhs ?? 0),
    maxProducts,
    aiTier: offering.aiTier ?? limits.aiTier,
    analytics: offering.analytics ?? limits.analytics,
    promotions: offering.promotions ?? limits.promotions,
    multiStore: offering.multiStore ?? limits.multiStore,
    teamManagement: offering.teamManagement ?? limits.teamManagement,
    apiAccess: offering.apiAccess ?? limits.apiAccess,
    freeTrialDays: offering.freeTrialDays ?? 0,
    aiDailyRequests: offering.aiDailyRequests ?? 0,
    aiMaxTokensPerRequest: offering.aiMaxTokensPerRequest ?? 0,
    isActive: offering.isActive ?? true,
  };
}

/**
 * DEFAULT SEED OFFERINGS (SAFE + EXPLICIT ITERATION)
 */
export function getDefaultSubscriptionOfferings() {
  return ALL_SUBSCRIPTION_PLANS.map((plan) => {
    const limits = getPlanLimits(plan);
    const meta = getPlanMeta(plan);

    return {
      tier: plan,
      name: meta.label,
      version: "v1",
      priceGhs: limits.priceGhs,
      maxProducts: limits.maxProducts,
      aiTier: limits.aiTier,
      analytics: limits.analytics,
      promotions: limits.promotions,
      multiStore: limits.multiStore,
      teamManagement: limits.teamManagement,
      apiAccess: limits.apiAccess,
      freeTrialDays: 0,
      aiDailyRequests: 0,
      aiMaxTokensPerRequest: 0,
      isActive: true,
    };
  });
}