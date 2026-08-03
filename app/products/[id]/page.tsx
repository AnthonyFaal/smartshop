"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
  ChevronDown, 
  ChevronUp
} from "lucide-react";


import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";
import { useInitialAuthUser } from "@/components/providers/auth-provider";
import { StarPicker, StarRating } from "@/components/ui/star-rating";

export default function ProductDetailPage() {
  const initialUser = useInitialAuthUser();
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: product, isLoading } = trpc.product.get.useQuery({
    id: params.id,
  });

  const defaultWishlist = trpc.wishlist.getDefaultWishlist.useQuery(undefined, {
    enabled: !!params.id,
  });

  const myWishlistItemsQuery = trpc.wishlist.getWishlistItems.useQuery(
    {
      wishlistId: defaultWishlist.data?.id,
    },
    {
      enabled: !!defaultWishlist.data?.id,
    }
  );

  const isWishlisted =
    (myWishlistItemsQuery.data ?? []).some(
      (i) => i.productId === product?.id
    ) ?? false;

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

  const toggleWishlistMutation = trpc.wishlist.toggleDefault.useMutation({
    onSuccess: async () => {
      await myWishlistItemsQuery.refetch();
      await defaultWishlist.refetch();
      toast.success(isWishlisted ? "Removed from wishlist" : "Saved to wishlist");
    },
    onError: (e) => toast.error(e.message),
  });

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
                  {(product.images as string[]).map((img: string, idx: number) => (
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

                {product.store.verificationStatus && (
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

            {/* WISHLIST + REVIEWS */}
            <div className="space-y-6 border-t pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    disabled={!initialUser}
                    className="rounded-full"
                    onClick={() => {
                      if (!initialUser) return;
                      if (!product?.id) return;
                      toggleWishlistMutation.mutate({ productId: product.id });
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`}
                    />
                  </Button>

                  <div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" aria-hidden />
                      <span className="text-sm font-medium text-zinc-900">
                        {Number(product.rating).toFixed(1)} / 5
                      </span>
                      <span className="text-sm text-zinc-500">
                        ({product.reviewCount} reviews)
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Updated instantly after you post or edit.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StarRating value={Number(product.rating)} />
                </div>
              </div>

              {/* MY REVIEW FORM + LIST */}
              <ReviewsSection productId={product.id} />
            </div>

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

function ReviewsSection({ productId }: { productId: string }) {
  const initialUser = useInitialAuthUser();
  
  const { data: queriedUser } = trpc.auth.me.useQuery();
  const user = queriedUser ?? initialUser ?? null;

  const utils = trpc.useUtils();

  const myReviewQuery = trpc.review.getMyReview.useQuery(
    { productId },
    { enabled: !!user }
  );


  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [limit] = useState(10);

  const pagedQuery = trpc.review.listProduct.useQuery(
    { productId, cursor, limit },
    { enabled: true }
  );

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [rating, setRating] = useState<number>(
    Number(myReviewQuery.data?.rating ?? 0)
  );

  useEffect(() => {
    setTitle(myReviewQuery.data?.title ?? "");
    setContent(myReviewQuery.data?.content ?? "");
    setRating(myReviewQuery.data?.rating ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myReviewQuery.data?.id]);

  const upsertMutation = trpc.review.upsertMyReview.useMutation({
    onSuccess: async () => {
      setCursor(undefined);
      await utils.review.listProduct.invalidate({ productId, cursor: undefined, limit });
      await utils.review.getMyReview.invalidate({ productId });
      toast.success("Review saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.review.deleteMyReview.useMutation({
    onSuccess: async () => {
      setCursor(undefined);
      await utils.review.listProduct.invalidate({ productId, cursor: undefined, limit });
      await utils.review.getMyReview.invalidate({ productId });
      toast.success("Review deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const canSubmit =
  !!user &&
  rating >= 0.5 &&
  rating <= 5 &&
  rating % 0.5 === 0;
  
  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">
          Reviews
        </h2>
        <p className="text-sm text-zinc-500">
          Share your experience to help others.
        </p>
      </div>

      {/* REVIEW FORM */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setReviewOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-zinc-50"
        >
          <div>
            <div className="font-medium">
              {myReviewQuery.data ? "Edit your review" : "Write a review"}
            </div>

            <div className="text-sm text-zinc-500">
              Share your experience with other buyers.
            </div>
          </div>

          {reviewOpen ? (
            <ChevronUp className="h-5 w-5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-500" />
          )}
        </button>

        {reviewOpen && (
          <div className="border-t p-4">
            <div className="rounded-lg border bg-white p-4">

        {!user ? (

          <div className="text-sm text-zinc-600">

            Sign in to write a review.

          </div>

        ) : (

          <div className="space-y-4">

            <div className="flex items-center gap-3">

              <div className="text-sm font-medium text-zinc-700">

                Your rating

              </div>

              <StarPicker

                value={rating || 0}

                onChange={(next) => setRating(next)}

              />

            </div>



            <div className="space-y-2">

              <label className="text-sm font-medium text-zinc-700">

                Title (optional)

              </label>

              <input

                value={title}

                onChange={(e) => setTitle(e.target.value)}

                placeholder="Short summary"

                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"

              />

            </div>



            <div className="space-y-2">

              <label className="text-sm font-medium text-zinc-700">

                Review

              </label>

              <textarea

                value={content}

                onChange={(e) => setContent(e.target.value)}

                placeholder="Tell us what you liked or disliked..."

                rows={4}

                className="w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"

              />

            </div>



            <div className="flex flex-wrap items-center gap-3">

              <Button

                type="button"

                disabled={!canSubmit || upsertMutation.isPending}

                onClick={() => {

                  if (!user) return;

                  upsertMutation.mutate({

                    productId,

                    rating,

                    title: title.trim() ? title.trim() : null,

                    content: content.trim() ? content.trim() : null,

                  });

                }}

              >

                {myReviewQuery.data ? "Update review" : "Post review"}

              </Button>



              {myReviewQuery.data?.id && (

                <Button

                  type="button"

                  variant="outline"

                  disabled={deleteMutation.isPending}

                  onClick={() => deleteMutation.mutate({ productId })}

                  className="border-zinc-200"

                >

                  Delete

                </Button>

              )}

            </div>



            {myReviewQuery.data?.isVerified && (

              <div className="flex items-center gap-2 text-xs text-emerald-700">

                <ShieldCheck className="h-4 w-4" />

                Verified purchase

              </div>

            )}

          </div>

        )}

      </div>
          </div>
        )}
      </div>

      {/* REVIEW LIST */}
    <div className="space-y-3">
        {pagedQuery.data?.reviews?.length === 0 && (
          <div className="text-sm text-zinc-500">No reviews yet.</div>
        )}

        {pagedQuery.data?.reviews?.map((r) => (
          <div key={r.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StarRating value={r.rating} />
                <span className="text-sm font-medium text-zinc-900">
                  {Number(r.rating).toFixed(1)} / 5
                </span>
                {r.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="mt-2 text-sm font-medium text-zinc-900">
              {r.title ?? " "}
            </div>

            {r.content && (
              <div className="mt-2 text-sm text-zinc-700">
                {r.content}
              </div>
            )}

            <div className="mt-3 text-xs text-zinc-500">
              By{" "}
              <span className="font-medium text-zinc-700">
                {r.user.displayName ?? "User"}
              </span>
            </div>
          </div>
        ))}

        {/* LOAD MORE */}
        {pagedQuery.data?.nextCursor && (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={pagedQuery.isFetching}
              onClick={() => {
                setCursor(pagedQuery.data?.nextCursor);
              }}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
