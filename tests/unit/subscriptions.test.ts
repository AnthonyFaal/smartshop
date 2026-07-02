import { describe, expect, it } from "vitest";
import { SubscriptionPlan } from "@prisma/client";

import {
  formatMaxProductsDisplay,
  getDefaultSubscriptionOfferings,
  getPlanMeta,
  getPlanOrder,
  normalizeSubscriptionOffering,
} from "@/lib/config/subscriptions";

describe("subscription plan metadata", () => {
  it("returns seller-friendly labels in the expected ascending order", () => {
    expect(getPlanOrder(SubscriptionPlan.FREE)).toBe(0);
    expect(getPlanOrder(SubscriptionPlan.STARTER)).toBe(1);
    expect(getPlanOrder(SubscriptionPlan.BUSINESS)).toBe(2);
    expect(getPlanOrder(SubscriptionPlan.ENTERPRISE)).toBe(3);

    expect(getPlanMeta(SubscriptionPlan.FREE).label).toBe("Free");
    expect(getPlanMeta(SubscriptionPlan.STARTER).label).toBe("Starter Seller");
    expect(getPlanMeta(SubscriptionPlan.BUSINESS).label).toBe("Pro Seller");
    expect(getPlanMeta(SubscriptionPlan.ENTERPRISE).label).toBe("Business Seller");
  });

  it("builds default offerings for every plan tier", () => {
    const offerings = getDefaultSubscriptionOfferings();

    expect(offerings).toHaveLength(4);
    expect(offerings.map((offering) => offering.tier)).toEqual([
      SubscriptionPlan.FREE,
      SubscriptionPlan.STARTER,
      SubscriptionPlan.BUSINESS,
      SubscriptionPlan.ENTERPRISE,
    ]);
    expect(offerings[0].priceGhs).toBe(0);
    expect(offerings[1].priceGhs).toBe(49);
    expect(offerings[2].priceGhs).toBe(149);
    expect(offerings[3].priceGhs).toBe(499);
  });

  it("treats null maxProducts as unlimited for paid tiers", () => {
    const business = normalizeSubscriptionOffering({
      tier: SubscriptionPlan.BUSINESS,
      name: "Pro Seller",
      maxProducts: null,
      priceGhs: 149,
      aiTier: "advanced",
      analytics: true,
      promotions: true,
      multiStore: false,
      teamManagement: false,
      apiAccess: false,
      freeTrialDays: 0,
      aiDailyRequests: 0,
      aiMaxTokensPerRequest: 0,
      isActive: true,
    } as never);

    expect(business.maxProducts).toBeNull();
    expect(business.isPaid).toBe(true);
  });

  it("renders Infinity for the 1M max-products threshold", () => {
    expect(formatMaxProductsDisplay(1000000)).toBe("Infinity");
    expect(formatMaxProductsDisplay(10000000)).toBe("Infinity");
    expect(formatMaxProductsDisplay(250)).toBe("250");
    expect(formatMaxProductsDisplay(null)).toBe("Infinity");
  });
});
