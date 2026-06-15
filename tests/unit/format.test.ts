import { describe, it, expect } from "vitest";
import { formatCurrency, slugify, generateOrderNumber } from "@/lib/utils/format";

describe("formatCurrency", () => {
  it("formats GHS amounts", () => {
    const result = formatCurrency(49.99);
    expect(result).toContain("49.99");
    expect(result).toMatch(/GH|₵|GHS/);
  });
});

describe("slugify", () => {
  it("converts text to URL-safe slug", () => {
    expect(slugify("Scientific Calculator FX-991EX")).toBe(
      "scientific-calculator-fx-991ex"
    );
  });

  it("handles special characters", () => {
    expect(slugify("Hello & World!")).toBe("hello-world");
  });
});

describe("generateOrderNumber", () => {
  it("generates unique order numbers with SS prefix", () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).toMatch(/^SS-/);
    expect(a).not.toBe(b);
  });
});
