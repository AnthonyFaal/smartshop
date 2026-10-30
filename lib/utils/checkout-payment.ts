import { z } from "zod";

export const paymentMethodSchema = z.enum(["MOBILE_MONEY", "CARD"]);
export const mobileMoneyNetworkSchema = z.enum(["MTN", "TELECEL_CASH"]);

export function buildCheckoutSchema() {
  return z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    region: z.string().min(1),
    postalCode: z.string().optional(),
    fulfillmentLocationId: z.string().uuid().optional(),
    fulfillmentMethod: z.enum(["PICKUP", "CAMPUS_DELIVERY"]).default("PICKUP"),
    paymentMethod: paymentMethodSchema,
    paymentPhone: z.string().trim().optional(),
    mobileMoneyNetwork: mobileMoneyNetworkSchema.optional(),
    cardholderName: z.string().trim().optional(),
    promoCode: z.string().trim().max(40).optional(),
    notes: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.fulfillmentMethod === "CAMPUS_DELIVERY" && !data.fulfillmentLocationId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fulfillmentLocationId"], message: "Choose a campus delivery zone." });
    }
    if (data.paymentMethod === "MOBILE_MONEY") {
      if (!data.mobileMoneyNetwork) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mobileMoneyNetwork"],
          message: "Please choose a mobile network.",
        });
      }

      if (!data.paymentPhone || !/^\+?[0-9]{9,15}$/.test(data.paymentPhone.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentPhone"],
          message: "Enter a valid phone number",
        });
      }
    }

    if (data.paymentMethod === "CARD") {
      if (!data.cardholderName || !data.cardholderName.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cardholderName"],
          message: "Please enter the name on the card.",
        });
      }
    }
  });
}

export type CheckoutFormValues = z.infer<ReturnType<typeof buildCheckoutSchema>>;
