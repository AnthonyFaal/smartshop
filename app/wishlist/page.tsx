"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2 } from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useInitialAuthUser } from "@/components/providers/auth-provider";
import { formatCurrency } from "@/lib/utils/format";

export default function WishlistPage() {
  const initialUser = useInitialAuthUser();
  const { data: queriedUser } = trpc.auth.me.useQuery();
  const user = queriedUser ?? initialUser ?? null;

  if (!user) {
    return (
      <PageShell>
        <EmptyState
          title="Sign in to view your wishlist"
          description="Save products you love and come back to them anytime."
          action={{ label: "Sign in", href: "/login?redirect=/wishlist" }}
        />
      </PageShell>
    );
  }

  const defaultWishlist = trpc.wishlist.getDefaultWishlist.useQuery(undefined, {
    enabled: !!user,
  });

  const itemsQuery = trpc.wishlist.getWishlistItems.useQuery(
    {
      wishlistId: defaultWishlist.data?.id,
    },
    {
      enabled: !!user && !!defaultWishlist.data?.id,
    }
  );

  const removeMutation = trpc.wishlist.remove.useMutation({
    onSuccess: async () => {
      await itemsQuery.refetch();
      await defaultWishlist.refetch();
    },
  });

  const items = itemsQuery.data ?? [];

  return (
    <PageShell showVerificationBanner>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Your wishlist</h1>
            <p className="text-sm text-zinc-500">
              Save products you love and come back anytime.
            </p>
          </div>
        </div>

        {itemsQuery.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <Card key={idx} className="h-56 animate-pulse" />
            ))}
          </div>
        )}

        {!itemsQuery.isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Heart className="h-12 w-12 text-zinc-300" aria-hidden />
            <h2 className="text-xl font-semibold text-zinc-900">No saved items</h2>
            <p className="text-zinc-600">
              Tap the heart on any product to save it here.
            </p>
            <Button className="mt-2" asChild>
              <Link href="/marketplace">Browse marketplace</Link>
            </Button>
          </div>
        )}

        {!itemsQuery.isLoading && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} className="group overflow-hidden">
                <div className="relative aspect-square bg-zinc-50">
                  <Image
                    src={item.product.images?.[0] ?? "/placeholder.jpg"}
                    alt={item.product.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900">
                      {item.product.title}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {item.product.store?.name ?? "—"}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-emerald-700">
                      {formatCurrency(Number(item.product.price))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={removeMutation.isPending}
                    onClick={() =>
                      removeMutation.mutate({ productId: item.productId })
                    }
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start rounded-none border-t p-4 text-zinc-700"
                >
                  <Link href={`/products/${item.product.slug}`}>View</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

