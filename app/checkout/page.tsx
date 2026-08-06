"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";
import { useAuthUser } from "@/components/providers/auth-provider";

declare global {
  interface Window {
    PaystackPop?: new () => { resumeTransaction: (accessCode: string) => void };
  }
}

const checkoutSchema = z.object({
  // Tarkwa-only defaults; shipping address line inputs are not shown in UI.
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().optional(),
  fulfillmentLocationId: z.string().uuid().optional(),
  paymentMethod: z.enum(["MOBILE_MONEY", "CARD"]),
  paymentPhone: z.string().trim().regex(/^\+?[0-9]{9,15}$/, "Enter a valid phone number"),
  cardholderName: z.string().trim().optional(),
  promoCode: z.string().trim().max(40).optional(),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verifyPaystack = trpc.order.verifyPaystack.useMutation({
    onSuccess: () => {
      toast.success("Payment completed successfully!");
      router.push("/orders");
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(error.message);
    },
  });

  const { data: cart, isLoading: cartLoading } = trpc.cart.get.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  const feePercent = Number(
    process.env.NEXT_PUBLIC_ORDER_FEE_PERCENT ?? 0.025
  );

  const { data: fulfillmentLocations } = trpc.location.search.useQuery(
    { query: "Tarkwa", types: ["CITY", "TOWN", "AREA", "DISTRICT", "SUBURB"], limit: 20 },
    { enabled: !!user }
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      // Fixed Tarkwa defaults (non-editable in UI)
      line1: "Tarkwa",
      line2: "",
      region: "Western Region",
      city: "Tarkwa",
      paymentMethod: "MOBILE_MONEY",
      paymentPhone: user?.phone ?? "",
      promoCode: "",
    },
  });

  const createOrder = trpc.order.create.useMutation({
    onSuccess: async (data) => {
      await utils.cart.get.invalidate();

      if (data?.paystackAccessCode && data.paystackReference) {
        if (!window.PaystackPop) {
          toast.error("Payment checkout is still loading. Please try again.");
          setIsSubmitting(false);
          return;
        }
        const popup = new window.PaystackPop();
        popup.resumeTransaction(data.paystackAccessCode);
        const paymentReference = data.paystackReference;
        const verifyAfterPopup = async (attempt = 0): Promise<void> => {
          if (attempt >= 10) {
            setIsSubmitting(false);
            toast.info("Payment is still processing. We’ll update your order when Paystack confirms it.");
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 3000 : 5000));
          try {
            const result = await verifyPaystack.mutateAsync({ reference: paymentReference });
            if (result.success) return;
            if (result.status === "FAILED") {
              setIsSubmitting(false);
              toast.error("Paystack reported that the payment failed.");
              return;
            }
            await verifyAfterPopup(attempt + 1);
          } catch {
            await verifyAfterPopup(attempt + 1);
          }
        };
        void verifyAfterPopup();
        return;
      }
      if (data?.paystackRedirectUrl) {
        window.location.href = data.paystackRedirectUrl;
        return;
      }

      toast.success("Order placed successfully!");
      router.push("/orders");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    },
  });

  const subtotal =
    cart?.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    ) ?? 0;

  const fee = subtotal * feePercent;
  const total = subtotal + fee;

  const selectedPaymentMethod = useWatch({
  control,
  name: "paymentMethod",
});

const promoCode = useWatch({
  control,
  name: "promoCode",
}) ?? "";
  const promotionPreview = trpc.order.previewPromotion.useQuery(
    { promoCode: promoCode.trim() },
    { enabled: Boolean(user && cart?.items.length && promoCode.trim().length >= 3), retry: false }
  );
  const appliedPreview = promotionPreview.data?.valid ? promotionPreview.data : null;
  const appliedDiscount = appliedPreview?.discount ?? 0;
  const displayedFee = appliedPreview?.fee ?? fee;
  const displayedTotal = appliedPreview?.total ?? total;
  const onSubmit = (data: CheckoutForm) => {
    if (!cart?.items.length) {
      toast.error("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    const { paymentMethod, paymentPhone, cardholderName, promoCode, notes, ...address } = data;
    createOrder.mutate({
      shippingAddress: { ...address, country: "GH" },
      paymentMethod,
      paymentPhone,
      cardholderName,
      promoCode,
      notes,
    });
  };

  return (
    <PageShell showVerificationBanner>
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Checkout</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Confirm your delivery details and payment method.
          </p>
        </div>

        {!user ? (
          <div className="mt-10 rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
            <p className="text-zinc-600">Please sign in to checkout.</p>
            <Button className="mt-4" asChild>
              <Link href="/login?redirect=/checkout">Sign in</Link>
            </Button>
          </div>
        ) : cartLoading ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <Card className="h-72 animate-pulse" />
            <Card className="h-72 animate-pulse" />
          </div>
        ) : !cart?.items.length ? (
          <div className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <p className="text-lg font-medium text-zinc-900">Your cart is empty</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add an item before starting checkout.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/marketplace">Browse marketplace</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]"
          >
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fulfillmentLocationId">
                      Pickup / drop-off location
                    </Label>
                    <Select
                      id="fulfillmentLocationId"
                      {...register("fulfillmentLocationId")}
                      defaultValue={fulfillmentLocations?.[0]?.id ?? undefined}
                    >
                      <option value="">Select a location</option>
                      {fulfillmentLocations?.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-zinc-500">Delivery is currently available at listed Tarkwa locations only.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value="Tarkwa" readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Input value="Western Region" readOnly />
                    </div>
                  </div>

                  {/* Hidden fields so backend input schema stays satisfied */}
                  <input type="hidden" {...register("line1")} value="Tarkwa" />
                  <input type="hidden" {...register("line2")} value="" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { value: "MOBILE_MONEY", label: "Mobile Money (MTN/Vodafone)" },
                    { value: "CARD", label: "Debit/Credit Card" },
                  ].map((method) => (
                    <label
                      key={method.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                    >
                      <input
                        type="radio"
                        value={method.value}
                        {...register("paymentMethod")}
                        className="h-4 w-4 text-emerald-600"
                      />
                      <span className="text-sm">{method.label}</span>
                    </label>
                  ))}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="paymentPhone">Payment phone number</Label>
                    <Input
                      id="paymentPhone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+233 24 123 4567"
                      {...register("paymentPhone")}
                    />
                    {errors.paymentPhone ? (
                      <p className="text-xs text-red-600">{errors.paymentPhone.message}</p>
                    ) : null}
                    <p className="text-xs text-zinc-500">
                      Used for mobile-money authorization. Card details are never entered on SmartShop.
                    </p>
                  </div>
                  {selectedPaymentMethod === "CARD" ? (
                    <div className="space-y-2">
                      <Label htmlFor="cardholderName">Name on card</Label>
                      <Input
                        id="cardholderName"
                        autoComplete="cc-name"
                        placeholder="Name as shown on card"
                        {...register("cardholderName")}
                      />
                      <p className="text-xs text-zinc-500">
                        Card number, expiry, and CVC are entered securely on Paystack’s hosted payment page.
                      </p>
                    </div>
                  ) : null}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="promoCode">Discount code</Label>
                    <Input id="promoCode" placeholder="Optional code" {...register("promoCode")} />
                    {promoCode.trim().length >= 3 ? (
                      <p className={`text-xs ${promotionPreview.data?.valid ? "text-emerald-700" : "text-zinc-500"}`} aria-live="polite">
                        {promotionPreview.isFetching
                          ? "Checking discount code..."
                          : appliedPreview
                            ? `${appliedPreview.code} applied — you save ${formatCurrency(appliedPreview.discount ?? 0)}.`
                            : promotionPreview.data?.reason ?? "Enter a valid code to see your savings."}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                      {item.product.images[0] && (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-zinc-700">
                        {item.product.title} x {item.quantity}
                      </p>
                      <p className="text-xs text-zinc-500">{item.product.store.name}</p>
                    </div>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(Number(item.product.price) * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-zinc-200 pt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {appliedDiscount > 0 ? (
                    <div className="flex justify-between text-sm text-emerald-700">
                      <span>Discount</span>
                      <span>-{formatCurrency(appliedDiscount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>Marketplace Fee ({(feePercent * 100).toFixed(2)}%)</span>
                    <span>{formatCurrency(displayedFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-3 font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(displayedTotal)}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || createOrder.isPending}
                >
                  {isSubmitting || createOrder.isPending
                    ? "Processing..."
                    : `Pay ${formatCurrency(displayedTotal)}`}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
    </PageShell>
  );
}
