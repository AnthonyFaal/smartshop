
"use client";

import { trpc } from "@/lib/trpc/client";
import { ProductCard } from "@/components/marketplace/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
interface ProductGridProps {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "createdAt" | "price" | "rating" | "soldCount";
  sortOrder?: "asc" | "desc";
}


export function ProductGrid({
  search,
  categoryId,
  minPrice,
  maxPrice,
  sortBy,
  sortOrder,
}: ProductGridProps) {
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    trpc.product.list.useInfiniteQuery(
      {
        search,
        categoryId,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const products = data?.pages.flatMap((page) => page.products) ?? [];

  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-zinc-700">No products found</p>
        <p className="mt-1 text-sm text-zinc-500">
          Try adjusting your search or browse all categories
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
