"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ShieldCheck, Star, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: product, isLoading } = trpc.product.get.useQuery({
    id: params.id,
  });

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => toast.success("Added to cart"),
    onError: (e) => toast.error(e.message),
  });

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-zinc-500">Product not found</p>
        </main>
      </div>
    );
  }

  const price = Number(product.price);
  const comparePrice = product.comparePrice ? Number(product.comparePrice) : null;

  const images = (product.images ?? []) as string[];

  const selectedImage = (() => {
    if (!images.length) return undefined;
    const idx = Math.min(Math.max(selectedImageIndex, 0), images.length - 1);
    return images[idx];
  })();

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={product.title}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : null}
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={selectedImageIndex <= 0}
                  onClick={() =>
                    setSelectedImageIndex((i) => Math.max(i - 1, 0))
                  }
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex flex-1 gap-2 overflow-auto">
                  {images.map((img, idx) => (
                    <button
                      key={img + idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={[
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white",
                        idx === selectedImageIndex
                          ? "border-emerald-500 ring-1 ring-emerald-500"
                          : "border-zinc-200",
                      ].join(" ")}
                      aria-label={`Select image ${idx + 1}`}
                    >
                      <Image
                        src={img}
                        alt={`${product.title} image ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={selectedImageIndex >= images.length - 1}
                  onClick={() =>
                    setSelectedImageIndex((i) =>
                      Math.min(i + 1, images.length - 1)
                    )
                  }
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {images.length === 0 && (
              <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                No images available
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{product.category.name}</Badge>
                {product.store.isVerified && (
                  <Badge variant="verified">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verified Store
                  </Badge>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-zinc-900 sm:text-3xl">
                {product.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Sold by {product.store.name}
              </p>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-emerald-700">
                {formatCurrency(price)}
              </span>
              {comparePrice && (
                <span className="text-lg text-zinc-400 line-through">
                  {formatCurrency(comparePrice)}
                </span>
              )}
            </div>

            {Number(product.rating) > 0 && (
              <div className="flex items-center gap-1 text-sm text-zinc-600">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {Number(product.rating).toFixed(1)} ({product.reviewCount} reviews)
              </div>
            )}

            <p className="text-zinc-600 leading-relaxed">{product.description}</p>

            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500">
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={product.stock <= 0 || addToCart.isPending}
              onClick={() => addToCart.mutate({ productId: product.id })}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
