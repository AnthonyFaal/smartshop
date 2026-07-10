"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";
import { useAuthUser } from "@/components/providers/auth-provider";

const checkoutSchema = z.object({
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  postalCode: z.string().optional(),
  fulfillmentLocationId: z.string().uuid().optional(),
  paymentMethod: z.enum([
    "MOBILE_MONEY",
    "CARD",
    "BANK_TRANSFER",
    "CASH_ON_DELIVERY",
  ]),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { user } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    { query: "a", types: ["CITY", "TOWN", "AREA", "DISTRICT", "SUBURB"], limit: 20 },
    { enabled: !!user }
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      region: "Western Region",
      city: "Tarkwa",
      paymentMethod: "MOBILE_MONEY",
    },
  });

  const createOrder = trpc.order.create.useMutation({
    onSuccess: async (data) => {
      await utils.cart.get.invalidate();

      if (data?.paystackRedirectUrl) {
        // Redirect user to Paystack authorization
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

  const selectedPaymentMethod = watch("paymentMethod");
  const onSubmit = (data: CheckoutForm) => {
    if (!cart?.items.length) {
      toast.error("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    const { paymentMethod, notes, ...address } = data;
    createOrder.mutate({
      shippingAddress: { ...address, country: "GH" },
      paymentMethod,
      notes,
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header />
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
                      Drop-off / Pick-up Point
                    </Label>
                    <select
                      id="fulfillmentLocationId"
                      {...register("fulfillmentLocationId")}
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      defaultValue={fulfillmentLocations?.[0]?.id ?? undefined}
                    >
                      <option value="">Select a location</option>
                      {fulfillmentLocations?.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line1">Address line 1</Label>
                    <Input id="line1" {...register("line1")} />
                    {errors.line1 && (
                      <p className="text-sm text-red-600">{errors.line1.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line2">Address line 2</Label>
                    <Input id="line2" {...register("line2")} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" {...register("city")} />
                      {errors.city && (
                        <p className="text-sm text-red-600">{errors.city.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Input id="region" {...register("region")} />
                      {errors.region && (
                        <p className="text-sm text-red-600">{errors.region.message}</p>
                      )}
                    </div>
                  </div>
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
                    { value: "CASH_ON_DELIVERY", label: "Cash on Delivery" },
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
                          unoptimized
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
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>Marketplace Fee ({(feePercent * 100).toFixed(2)}%)</span>
                    <span>{formatCurrency(fee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-3 font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || createOrder.isPending}
                >
                  {isSubmitting || createOrder.isPending
                    ? "Processing..."
                    : selectedPaymentMethod === "CASH_ON_DELIVERY" ||
                        selectedPaymentMethod === "BANK_TRANSFER"
                      ? "Place Order"
                      : `Pay ${formatCurrency(total)}`}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
