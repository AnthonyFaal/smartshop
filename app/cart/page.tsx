"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";

type CartItem = {
  id: string;
  quantity: number;
  selectedSize?: string | null;
  product: {
    id: string;
    title: string;
    price: number | string | { toString(): string };
    images: string[];
    stock: number;
    variants?: Array<{ size: string; quantity: number }>;
    store: {
      name: string;
      slug: string;
    };
  };
};

type CartData = {
  items: CartItem[];
};

export default function CartPage() {
  const utils = trpc.useUtils();
  const { data: cart, isLoading } = trpc.cart.get.useQuery();
  const updateMutation = trpc.cart.update.useMutation({
    onSuccess: () => utils.cart.get.invalidate(),
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to update cart";
      toast.error(message);
    },
  });
  const removeMutation = trpc.cart.remove.useMutation({
    onSuccess: () => {
      utils.cart.get.invalidate();
      toast.success("Item removed");
    },
  });

  const cartData = (cart as CartData | undefined) ?? undefined;
  const cartItems = cartData?.items ?? [];

  const subtotal = cartItems.reduce<number>(
    (sum, item: CartItem) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const itemCount = cartItems.reduce<number>((sum, item: CartItem) => sum + item.quantity, 0);

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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Shopping Cart</h1>
            <p className="text-sm text-zinc-500">
              {itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"} ready for checkout` : "Review your saved items before checkout"}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/marketplace">
              <ShoppingBag className="h-4 w-4" />
              Keep shopping
            </Link>
          </Button>
        </div>

        {!cartItems.length ? (
          <div className="mt-12 rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-zinc-300" aria-hidden />
            <p className="mt-4 text-lg font-medium text-zinc-900">Your cart is empty</p>
            <p className="mt-1 text-sm text-zinc-500">Find products from verified sellers and add them here.</p>
            <Button className="mt-6" asChild>
              <Link href="/marketplace">Browse products</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cartItems.map((item: CartItem) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 sm:h-28 sm:w-28"
                    >
                      {item.product.images[0] && (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 112px"
                        />
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                      <div>
                        <Link
                          href={`/products/${item.product.id}`}
                          className="line-clamp-2 font-medium text-zinc-900 hover:text-emerald-600"
                        >
                          {item.product.title}
                        </Link>
                        <p className="text-sm text-zinc-500">
                          {item.product.store.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-700">
                          {formatCurrency(Number(item.product.price))}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const selectedSize = (item.selectedSize ?? "").trim();
                            const variants = item.product.variants;

                            const maxQty =
                              Array.isArray(variants) &&
                              variants.length > 0 &&
                              selectedSize
                                ? variants.find((v) => v.size === selectedSize)?.quantity ??
                                  0
                                : item.product.stock;

                            const safeMaxQty = Math.max(0, maxQty ?? 0);

                            return (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={updateMutation.isPending}
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
                                  disabled={
                                    updateMutation.isPending ||
                                    item.quantity >= safeMaxQty
                                  }
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
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
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
                  <span className="text-zinc-500">Items</span>
                  <span>{itemCount}</span>
                </div>
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
                  <Link href="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </Link>
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
