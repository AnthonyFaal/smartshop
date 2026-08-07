"use client";

import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminRoutes } from "@/lib/admin/navigation";
import { trpc } from "@/lib/trpc/client";
import { Star } from "lucide-react";

export default function AdminSellerReviewsPage() {
  const { data, isLoading } = trpc.admin.reviewList.useQuery({ limit: 20 });

  const reviews = data?.items ?? [];

  return (
    <PageShell>
      <AdminPageShell activeHref={adminRoutes.sellerReviews}>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Seller Reviews</p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Seller and product reviews</h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-600">
              Monitor recent seller and product feedback from buyers without mixing it with verification workflows.
            </p>
          </div>

          <Card className="mt-8 border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-emerald-600" />
                Recent reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-zinc-200 p-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-3 h-3 w-full" />
                    <Skeleton className="mt-2 h-3 w-3/4" />
                  </div>
                ))
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                  No reviews have been submitted yet.
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {review.user?.profile?.displayName ?? review.user?.email ?? "Anonymous user"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {review.product?.title ? `Product: ${review.product.title}` : review.store?.name ? `Store: ${review.store.name}` : "Marketplace feedback"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {review.rating.toFixed(1)}
                      </Badge>
                    </div>
                    {review.title ? <p className="mt-3 font-medium text-zinc-800">{review.title}</p> : null}
                    {review.content ? <p className="mt-2 text-sm text-zinc-600">{review.content}</p> : null}
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-400">
                      {new Date(review.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </main>
      </AdminPageShell>
    </PageShell>
  );
}
