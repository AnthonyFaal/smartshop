"use client";

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

const checkoutSchema = z.object({
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  postalCode: z.string().optional(),
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
  const [isLoading, setIsLoading] = useState(false);
  const { data: cart } = trpc.cart.get.useQuery();

  const {
    register,
    handleSubmit,
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
    onSuccess: () => {
      toast.success("Order placed successfully!");
      router.push("/orders");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const subtotal =
    cart?.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    ) ?? 0;

  const onSubmit = (data: CheckoutForm) => {
    setIsLoading(true);
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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register("city")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input id="region" {...register("region")} />
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
              {cart?.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-zinc-600">
                    {item.product.title} × {item.quantity}
                  </span>
                  <span>
                    {formatCurrency(Number(item.product.price) * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t border-zinc-200 pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Processing..." : `Pay ${formatCurrency(subtotal)}`}
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
      <Footer />
    </div>
  );
}
