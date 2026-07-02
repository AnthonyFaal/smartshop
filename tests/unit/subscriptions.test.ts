import { describe, expect, it } from "vitest";
import { SubscriptionPlan } from "@prisma/client";

import { getPlanMeta, getPlanOrder } from "@/lib/config/subscriptions";

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
});
