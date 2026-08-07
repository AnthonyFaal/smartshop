import { describe, it, expect } from "vitest";
import { computeUpdatedPriceAndCompare } from "@/server/services/product.service";

describe("computeUpdatedPriceAndCompare", () => {
  it("always sets updatedPrice=newPrice", () => {
    const out = computeUpdatedPriceAndCompare({
      currentPrice: 100,
      newPrice: 90,
      currentComparePrice: 120,
    });

    expect(out.updatedPrice).toBe(90);
  });

  it("discount: when newPrice < currentPrice, sets updatedComparePrice=currentPrice (overwrites any existing compare price)", () => {
    const out = computeUpdatedPriceAndCompare({
      currentPrice: 100,
      newPrice: 90,
      currentComparePrice: 110,
    });

    expect(out.updatedComparePrice).toBe(100);
  });

  it("no discount: when newPrice >= currentPrice, clears comparePrice (null)", () => {
    const out = computeUpdatedPriceAndCompare({
      currentPrice: 100,
      newPrice: 100,
      currentComparePrice: 100,
    });

    expect(out.updatedComparePrice).toBeNull();
  });

  it("no discount on increase: always clears comparePrice even if currentComparePrice existed", () => {
    const out = computeUpdatedPriceAndCompare({
      currentPrice: 100,
      newPrice: 120,
      currentComparePrice: 100,
    });

    expect(out.updatedComparePrice).toBeNull();
  });

  it("when currentComparePrice is null and newPrice is lower, comparePrice is set to currentPrice", () => {
    const out = computeUpdatedPriceAndCompare({
      currentPrice: 100,
      newPrice: 90,
      currentComparePrice: null,
    });

    expect(out.updatedComparePrice).toBe(100);
  });
});
