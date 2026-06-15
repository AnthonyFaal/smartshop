"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";

export default function CartPage() {
  const utils = trpc.useUtils();
  const { data: cart, isLoading } = trpc.cart.get.useQuery();
  const updateMutation = trpc.cart.update.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
  });
  const removeMutation = trpc.cart.remove.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      toast.success("Item removed");
    },
  });

  const subtotal =
    cart?.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    ) ?? 0;

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>

        {!cart?.items.length ? (
          <div className="mt-12 text-center">
            <p className="text-zinc-500">Your cart is empty</p>
            <Button className="mt-4" asChild>
              <Link href="/marketplace">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cart.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex gap-4 p-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {item.product.images[0] && (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link
                          href={`/products/${item.product.id}`}
                          className="font-medium hover:text-emerald-600"
                        >
                          {item.product.title}
                        </Link>
                        <p className="text-sm text-zinc-500">
                          {item.product.store.name}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateMutation.mutate({
                                itemId: item.id,
                                quantity: item.quantity - 1,
                              })
                            }
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateMutation.mutate({
                                itemId: item.id,
                                quantity: item.quantity + 1,
                              })
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">
                            {formatCurrency(
                              Number(item.product.price) * item.quantity
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeMutation.mutate({ itemId: item.id })
                            }
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="h-fit">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-lg font-semibold">Order Summary</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="border-t border-zinc-200 pt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>
                <Button className="w-full" asChild>
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
