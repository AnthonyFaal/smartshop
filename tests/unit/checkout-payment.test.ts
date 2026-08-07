import { describe, expect, it } from "vitest";
import { buildCheckoutSchema } from "@/lib/utils/checkout-payment";

describe("checkout payment validation", () => {
  const schema = buildCheckoutSchema();

  it("requires phone and network for mobile money", () => {
    const result = schema.safeParse({
      line1: "Tarkwa",
      city: "Tarkwa",
      region: "Western Region",
      paymentMethod: "MOBILE_MONEY",
      paymentPhone: "",
      mobileMoneyNetwork: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["mobileMoneyNetwork"] }),
          expect.objectContaining({ path: ["paymentPhone"] }),
        ])
      );
    }
  });

  it("only requires cardholder name for card payments", () => {
    const result = schema.safeParse({
      line1: "Tarkwa",
      city: "Tarkwa",
      region: "Western Region",
      paymentMethod: "CARD",
      paymentPhone: "",
      cardholderName: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["cardholderName"] }),
        ])
      );
    }
  });
});
