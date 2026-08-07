import { describe, expect, it } from "vitest";

import { getSellerVerificationSummary } from "@/lib/admin/verification";

describe("getSellerVerificationSummary", () => {
  it("returns a human-readable label and progress for a completed submission", () => {
    const summary = getSellerVerificationSummary({
      phoneVerified: true,
      hasGhanaCard: true,
      hasSelfie: true,
      status: "UNDER_REVIEW",
    });

    expect(summary.progress).toBe(100);
    expect(summary.completedCount).toBe(3);
    expect(summary.statusLabel).toBe("Under review");
    expect(summary.pendingSteps).toEqual([]);
  });

  it("marks missing steps as pending", () => {
    const summary = getSellerVerificationSummary({
      phoneVerified: true,
      hasGhanaCard: false,
      hasSelfie: true,
      status: "PENDING",
    });

    expect(summary.progress).toBe(67);
    expect(summary.completedCount).toBe(2);
    expect(summary.statusLabel).toBe("Pending");
    expect(summary.pendingSteps).toEqual(["Ghana Card"]);
  });
});
