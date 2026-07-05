"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: product, isLoading } = trpc.product.get.useQuery({
    id: params.id,
  });

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: async () => {
      await utils.cart.get.invalidate();
      toast.success("Added to cart");
    },
    onError: (e) => toast.error(e.message),
  });

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  /**
   * HCI CHANGE:
   * Replace single selection with multi-variant quantity map
   */
  const [variantQuantities, setVariantQuantities] = useState<
    Record<string, number>
  >({});

  const { variants, hasVariants } = useMemo(() => {
    const v = (product?.variants ?? []) as Array<{
      size: string;
      quantity: number;
    }>;
    return { variants: v, hasVariants: v.length > 0 };
  }, [product]);

  const variantMap = useMemo(
    () => new Map(variants.map((v) => [v.size, v.quantity])),
    [variants]
  );

  const updateQty = (size: string, delta: number) => {
    const stock = variantMap.get(size) ?? 0;

    setVariantQuantities((prev) => {
      const current = prev[size] ?? 0;
      const nextQty = Math.min(stock, Math.max(0, current + delta));

      const next = { ...prev };

      if (nextQty <= 0) delete next[size];
      else next[size] = nextQty;

      return next;
    });
  };

  const totalSelectedItems = Object.values(variantQuantities).reduce(
    (a, b) => a + b,
    0
  );

  const handleAddToCart = () => {
    if (hasVariants && Object.keys(variantQuantities).length === 0) {
      toast.error("Select at least one variant");
      return;
    }

    // Map to the exact shape expected by the backend
    const items = hasVariants
      ? Object.entries(variantQuantities).map(([size, quantity]) => ({
          selectedSize: size, // Rename 'size' to 'selectedSize'
          quantity,
        }))
      : [{ selectedSize: "", quantity: 1 }]; // Use empty string for no size

    addToCart.mutate({
      productId: product!.id,
      items,
    });
  };

  if (isLoading) return <LoadingState />;
  if (!product) return <NotFoundState />;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* IMAGE SECTION */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg border bg-zinc-100">
              <Image
                src={product.images[selectedImageIndex] || "/placeholder.jpg"}
                alt={product.title}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>

            {product.images.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={selectedImageIndex === 0}
                  onClick={() =>
                    setSelectedImageIndex((i) => Math.max(i - 1, 0))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex flex-1 gap-2 overflow-auto">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                        idx === selectedImageIndex
                          ? "border-emerald-500"
                          : "border-zinc-200"
                      }`}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={
                    selectedImageIndex === product.images.length - 1
                  }
                  onClick={() =>
                    setSelectedImageIndex((i) =>
                      Math.min(i + 1, product.images.length - 1)
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* PRODUCT INFO */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {product.categoryId ? "Category" : "Category"}
                </Badge>

                {product.store.isVerified && (
                  <Badge variant="outline" className="text-emerald-700">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>

              <h1 className="mt-2 text-3xl font-bold">
                {product.title}
              </h1>

              <p className="text-sm text-zinc-500">
                Sold by {product.store.name}
              </p>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-emerald-700">
                  {formatCurrency(Number(product.price))}
                </span>

                {product.comparePrice && (
                  <span className="text-zinc-400 line-through">
                    {formatCurrency(Number(product.comparePrice))}
                  </span>
                )}
              </div>
            </div>

            <p className="leading-relaxed text-zinc-600">
              {product.description}
            </p>

            {/* VARIANTS (HCI REDESIGN) */}
            {hasVariants && (
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    Variants
                  </Label>

                  {totalSelectedItems > 0 && (
                    <span className="text-sm text-zinc-500">
                      {totalSelectedItems} item(s) selected
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {variants.map((v) => {
                    const qty = variantQuantities[v.size] ?? 0;
                    const out = v.quantity <= 0;
                    const lowStock = v.quantity > 0 && v.quantity <= 3;

                    return (
                      <div
                        key={v.size}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        {/* LEFT */}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {v.size}

                            {lowStock && (
                              <span className="text-xs text-amber-600">
                                Low stock
                              </span>
                            )}

                            {out && (
                              <span className="text-xs text-red-500">
                                Out of stock
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-zinc-500">
                            {v.quantity} available
                          </div>
                        </div>

                        {/* RIGHT */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={qty <= 0 || out}
                            onClick={() => updateQty(v.size, -1)}
                          >
                            -
                          </Button>

                          <div className="w-10 text-center text-sm">
                            {qty}
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            disabled={qty >= v.quantity || out}
                            onClick={() => updateQty(v.size, 1)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADD TO CART */}
            <div className="border-t pt-6">
              <Button
                size="lg"
                className="w-full"
                disabled={
                  addToCart.isPending ||
                  (hasVariants && totalSelectedItems === 0)
                }
                onClick={handleAddToCart}
              >
                {addToCart.isPending
                  ? "Adding..."
                  : `Add to Cart${
                      totalSelectedItems > 0
                        ? ` (${totalSelectedItems})`
                        : ""
                    }`}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ---------------- STATES ---------------- */

function LoadingState() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl p-8">
        <Skeleton className="h-96 w-full" />
      </main>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex h-screen items-center justify-center">
      Product not found.
    </div>
  );
}