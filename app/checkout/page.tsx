"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle,
  CreditCard,
  MapPin,
  Package,
  Phone,
  Smartphone,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { buildCheckoutSchema } from "@/lib/utils/checkout-payment";
import { formatCurrency } from "@/lib/utils/format";
import { useAuthUser } from "@/components/providers/auth-provider";
import { z } from "zod";

declare global {
  interface Window {
    PaystackPop?: new () => { resumeTransaction: (accessCode: string) => void };
  }
}

const checkoutSchema = buildCheckoutSchema();

// Zod's `.default()` makes this field optional while the user is editing, but
// guarantees it is present after resolver validation. React Hook Form needs
// both sides of that contract represented explicitly.
type CheckoutFormInput = z.input<typeof checkoutSchema>;
type CheckoutForm = z.output<typeof checkoutSchema>;

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
  } = useForm<CheckoutFormInput, unknown, CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      // Fixed Tarkwa defaults (non-editable in UI)
      line1: "Tarkwa",
      line2: "",
      region: "Western Region",
      city: "Tarkwa",
      paymentMethod: "MOBILE_MONEY",
      paymentPhone: user?.phone ?? "",
      mobileMoneyNetwork: "MTN",
      fulfillmentMethod: "PICKUP",
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
  }) ?? "MOBILE_MONEY";

  const fulfillmentMethod = useWatch({ control, name: "fulfillmentMethod" }) ?? "PICKUP";
  const fulfillmentLocationId = useWatch({ control, name: "fulfillmentLocationId" });
  const deliveryQuote = trpc.delivery.quote.useQuery(
    { fulfillmentMethod, locationId: fulfillmentLocationId },
    { enabled: Boolean(user && (fulfillmentMethod === "PICKUP" || fulfillmentLocationId)), retry: false }
  );

  const selectedMobileNetwork = useWatch({
    control,
    name: "mobileMoneyNetwork",
  }) ?? "MTN";

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
  const deliveryFee = deliveryQuote.data?.shippingCost ?? 0;
  const displayedTotal = (appliedPreview?.total ?? total) + deliveryFee;
  const onSubmit = (data: CheckoutForm) => {
    if (!cart?.items.length) {
      toast.error("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    const { paymentMethod, paymentPhone, cardholderName, promoCode, notes, fulfillmentMethod, fulfillmentLocationId, ...address } = data;
    const normalizedPaymentPhone = paymentMethod === "MOBILE_MONEY"
      ? (paymentPhone ?? "").trim()
      : "";

    createOrder.mutate({
      shippingAddress: { ...address, country: "GH" },
      fulfillmentMethod,
      fulfillmentLocationId: fulfillmentMethod === "CAMPUS_DELIVERY" ? fulfillmentLocationId : undefined,
      paymentMethod,
      paymentPhone: normalizedPaymentPhone,
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
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="h-96 animate-pulse lg:col-span-8" />
            <Card className="h-72 animate-pulse lg:col-span-4" />
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
            className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12"
          >
            <div className="lg:col-span-8 space-y-5">
              <Card>
                <CardHeader className="flex-row items-center gap-2 p-4 pb-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-base">Checkout Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-4 pt-2">
                  {/* ---- Delivery ---- */}
                  <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <Truck className="h-3.5 w-3.5" />
                      Delivery
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 p-3 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                        <input type="radio" value="PICKUP" {...register("fulfillmentMethod")} />
                        <span><span className="block font-medium text-zinc-900">Pickup point</span><span className="text-xs text-zinc-500">Free. Show your pickup code when collecting.</span></span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 p-3 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                        <input type="radio" value="CAMPUS_DELIVERY" {...register("fulfillmentMethod")} />
                        <span><span className="block font-medium text-zinc-900">Campus delivery</span><span className="text-xs text-zinc-500">A clear zone fee and delivery promise.</span></span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fulfillmentLocationId">
                        Pickup / drop-off location
                      </Label>
                      <Select
                        id="fulfillmentLocationId"
                        {...register("fulfillmentLocationId")}
                        defaultValue={fulfillmentLocations?.[0]?.id ?? undefined}
                        disabled={fulfillmentMethod !== "CAMPUS_DELIVERY"}
                      >
                        <option value="">Select a location</option>
                        {fulfillmentLocations?.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </Select>
                      <p className="text-xs text-zinc-500">
                        {fulfillmentMethod === "CAMPUS_DELIVERY"
                          ? deliveryQuote.isLoading ? "Checking delivery fee…" : deliveryQuote.data ? `${formatCurrency(deliveryQuote.data.shippingCost)} · estimated within ${deliveryQuote.data.zone?.promisedMinutes ?? 60} minutes.` : "Choose an eligible campus zone."
                          : "Pickup is free. You will receive a code after payment."}
                      </p>
                      {errors.fulfillmentLocationId && <p className="text-xs text-red-600">{errors.fulfillmentLocationId.message}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                        <MapPin className="h-3.5 w-3.5" />
                        Tarkwa
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-medium text-zinc-700">
                        <MapPin className="h-3.5 w-3.5" />
                        Western Region
                      </span>
                    </div>

                    {/* Hidden fields so backend input schema stays satisfied */}
                    <input type="hidden" {...register("line1")} value="Tarkwa" />
                    <input type="hidden" {...register("line2")} value="" />
                  </section>

                  <div className="border-t border-zinc-100" />

                  {/* ---- Payment ---- */}
                  <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <CreditCard className="h-3.5 w-3.5" />
                      Payment
                    </h2>
<fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="sr-only">Choose your payment method</legend>
                    {[
                      {
                        value: "MOBILE_MONEY",
                        title: "Mobile Money",
                        subtitle: "MTN or Telecel Cash",
                        icon: <Smartphone className="h-4 w-4 text-zinc-700" />,
                      },
                      {
                        value: "CARD",
                        title: "Debit / Credit Card",
                        subtitle: "Visa, Mastercard",
                        icon: <CreditCard className="h-4 w-4 text-zinc-700" />,
                      },
                    ].map((method) => {
                      const isSelected = selectedPaymentMethod === method.value;

                      return (
                        <label
                          key={method.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="radio"
                            value={method.value}
                            {...register("paymentMethod")}
                            className="sr-only"
                          />
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${isSelected ? "border-emerald-500/30 bg-white" : "border-zinc-200 bg-zinc-50"}`}>
                            {method.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-900">{method.title}</p>
                            <p className="truncate text-xs text-zinc-500">{method.subtitle}</p>
                          </div>
                          {isSelected ? (
                            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <div className="h-4 w-4 shrink-0 rounded-full border border-zinc-300" />
                          )}
                        </label>
                      );
                    })}
                  </fieldset>

                  <div
                    className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
                      selectedPaymentMethod === "MOBILE_MONEY"
                        ? "max-h-80 translate-y-0 opacity-100"
                        : "max-h-0 -translate-y-2 opacity-0"
                    }`}
                  >
                    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="mobileMoneyNetwork">Mobile Network</Label>
                          <Select id="mobileMoneyNetwork" {...register("mobileMoneyNetwork")}>
                            <option value="MTN">MTN</option>
                            <option value="TELECEL_CASH">Telecel Cash</option>
                          </Select>
                          {errors.mobileMoneyNetwork ? (
                            <p className="text-xs text-red-600">{errors.mobileMoneyNetwork.message}</p>
                          ) : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="paymentPhone" className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-zinc-400" />
                            Phone Number
                          </Label>
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
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Used for mobile-money authorization. Card details are never entered on SmartShop.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${
                      selectedPaymentMethod === "CARD"
                        ? "max-h-[24rem] translate-y-0 opacity-100"
                        : "max-h-0 -translate-y-2 opacity-0"
                    }`}
                  >
                    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cardNumber" className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
                          Card Number
                        </Label>
                        <Input id="cardNumber" placeholder="4242 4242 4242 4242" readOnly />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="cardExpiry">Expiry Date</Label>
                          <Input id="cardExpiry" placeholder="MM/YY" readOnly />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cardCvv">CVV</Label>
                          <Input id="cardCvv" placeholder="123" readOnly />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cardholderName">Cardholder Name</Label>
                        <Input
                          id="cardholderName"
                          autoComplete="cc-name"
                          placeholder="Name as shown on card"
                          {...register("cardholderName")}
                        />
                        {errors.cardholderName ? (
                          <p className="text-xs text-red-600">{errors.cardholderName.message}</p>
                        ) : null}
                      </div>
                      <p className="text-xs text-zinc-500">
                        Card number, expiry, and CVV are entered securely on Paystack’s hosted payment page.
                      </p>
                    </div>
                  </div>

<div className="rounded-lg border border-zinc-200 bg-emerald-50/50 p-3 text-sm text-zinc-700">
                    {selectedPaymentMethod === "MOBILE_MONEY"
                      ? `You'll pay ${formatCurrency(displayedTotal)} via ${selectedMobileNetwork === "TELECEL_CASH" ? "Telecel Cash" : "MTN"} Mobile Money.`
                      : `You'll pay ${formatCurrency(displayedTotal)} using your Debit/Credit Card.`}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="promoCode" className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-zinc-400" />
                      Discount code
                    </Label>
                    <div className="flex gap-2">
                      <Input id="promoCode" placeholder="Optional code" {...register("promoCode")} className="flex-1" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          if (promoCode.trim().length >= 3) {
                            void promotionPreview.refetch();
                          }
                        }}
                      >
                        Apply
                      </Button>
                    </div>
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
                  </section>
                </CardContent>
              </Card>
            </div>

<Card className="lg:col-span-4 h-fit lg:sticky lg:top-6 self-start">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4 text-emerald-600" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-2">
                <ul className="space-y-2.5">
                  {cart.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5 text-sm">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                        {item.product.images[0] && (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-700">
                          {item.product.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.product.store.name} · Qty {item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium">
                        {formatCurrency(Number(item.product.price) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-zinc-200 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
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
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>{fulfillmentMethod === "CAMPUS_DELIVERY" ? "Campus delivery" : "Pickup"}</span>
                    <span>{fulfillmentMethod === "CAMPUS_DELIVERY" ? formatCurrency(deliveryFee) : "Free"}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2.5 text-base font-semibold">
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
