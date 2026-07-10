"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  Boxes,
  Eye,
  Loader2,
  PackagePlus,
  Search,
  Store,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { trpc } from "@/lib/trpc/client";

type ProductStatus =
  | "DRAFT"
  | "ACTIVE"
  | "OUT_OF_STOCK"
  | "SUSPENDED"
  | "ARCHIVED";

const statusOptions: Array<{ label: string; value: ProductStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Out of stock", value: "OUT_OF_STOCK" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Archived", value: "ARCHIVED" },
];

const statusStyles: Record<ProductStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAFT: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  OUT_OF_STOCK: "bg-amber-50 text-amber-700 ring-amber-200",
  SUSPENDED: "bg-red-50 text-red-700 ring-red-200",
  ARCHIVED: "bg-slate-100 text-slate-700 ring-slate-200",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatStatus(status: ProductStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default function SellerProductsPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [storeId, setStoreId] = useState("ALL");
  const [status, setStatus] = useState<ProductStatus | "ALL">("ALL");
  const [error, setError] = useState<string | null>(null);

  // Per-product price update drafts
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPriceFor, setSavingPriceFor] = useState<string | null>(null);

  const { data: stores, isLoading: storesLoading } = trpc.store.list.useQuery();
  const {
    data: products,
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = trpc.product.sellerList.useQuery({
    search: search.trim() || undefined,
    storeId: storeId === "ALL" ? undefined : storeId,
    status: status === "ALL" ? undefined : status,
  });

  const updateProduct = trpc.product.update.useMutation({
    onSuccess: async () => {
      await utils.product.sellerList.invalidate();
      await utils.auth.sellerDashboard.invalidate();
    },
  });

  const deleteProduct = trpc.product.delete.useMutation({
    onSuccess: async () => {
      await utils.product.sellerList.invalidate();
      await utils.auth.sellerDashboard.invalidate();
      await utils.store.list.invalidate();
    },
  });

  const storeList = useMemo(() => stores ?? [], [stores]);
  const productList = useMemo(() => products ?? [], [products]);
  const isBusy = updateProduct.isPending || deleteProduct.isPending;

  const stats = useMemo(() => {
    return productList.reduce(
      (current, product) => {
        current.total += 1;
        current.views += product.viewCount;
        current.sold += product.soldCount;
        if (product.status === "ACTIVE") current.active += 1;
        if (product.stock <= 0) current.outOfStock += 1;
        return current;
      },
      { total: 0, active: 0, outOfStock: 0, views: 0, sold: 0 }
    );
  }, [productList]);

  const handleStatusChange = async (id: string, nextStatus: ProductStatus) => {
    setError(null);

    try {
      await updateProduct.mutateAsync({ id, status: nextStatus });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update product status."));
    }
  };

  const handleArchive = async (id: string) => {
    setError(null);

    try {
      await deleteProduct.mutateAsync({ id });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to archive product."));
    }
  };

  const handlePriceUpdate = async (id: string) => {
    setError(null);

    const draft = priceDrafts[id];
    const nextPrice = Number(draft);

    if (!Number.isFinite(nextPrice) || nextPrice < 1) {
      setError("New price must be at least 1.");
      return;
    }

    try {
      setSavingPriceFor(id);
      await updateProduct.mutateAsync({ id, price: nextPrice });
      setPriceDrafts((c) => ({ ...c, [id]: "" }));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update product price."));
    } finally {
      setSavingPriceFor((cur) => (cur === id ? null : cur));
    }
  };

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/products">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Create, review, publish, and manage your product listings.
              </p>
            </div>
            <Button asChild>
              <Link href="/seller/products/new">
                <PackagePlus className="h-4 w-4" />
                Create product
              </Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Total products</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {stats.total}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Active listings</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700">
                  {stats.active}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Out of stock</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">
                  {stats.outOfStock}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Views / Sold</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {stats.views} / {stats.sold}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Manage products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
                <div className="space-y-2">
                  <Label htmlFor="product-search">Search</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="product-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Name, SKU, or store"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-filter">Store</Label>
                  <select
                    id="store-filter"
                    value={storeId}
                    onChange={(event) => setStoreId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                    disabled={storesLoading}
                  >
                    <option value="ALL">All stores</option>
                    {storeList.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <select
                    id="status-filter"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as ProductStatus | "ALL")
                    }
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              {productsLoading ? (
                <div className="space-y-3">
                  <div className="h-20 w-full animate-pulse rounded-lg bg-zinc-100" />
                  <div className="h-20 w-full animate-pulse rounded-lg bg-zinc-100" />
                  <div className="h-20 w-full animate-pulse rounded-lg bg-zinc-100" />
                </div>
              ) : productList.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <div className="hidden grid-cols-[1.5fr_0.7fr_0.7fr_0.9fr_1fr] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 lg:grid">
                    <span>Product</span>
                    <span>Stock</span>
                    <span>Price</span>
                    <span>Status</span>
                    <span className="text-right">Actions</span>
                  </div>

                  <div className={cn("divide-y divide-zinc-200", productsFetching && "opacity-70")}>
                    {productList.map((product) => {
                      const imageUrl = product.images[0];
                      const canActivate = product.stock > 0;

                      return (
                        <div
                          key={product.id}
                          className="grid gap-4 px-4 py-4 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.9fr_1fr] lg:items-center"
                        >
                          <div className="flex min-w-0 gap-3">
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={product.title}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <Boxes className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-zinc-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-900">
                                {product.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                <span className="inline-flex items-center gap-1">
                                  <Store className="h-3 w-3" />
                                  {product.store.name}
                                </span>
                                <span>{product.category.name}</span>
                                {product.sku ? <span>SKU {product.sku}</span> : null}
                              </div>
                              <p className="mt-1 text-xs text-zinc-500">
                                Added {formatDate(product.createdAt, "en-GH", { timeStyle: undefined })}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {product.stock}
                            </p>
                            <p className="text-xs text-zinc-500">in stock</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {formatCurrency(Number(product.price))}
                            </p>
                            {product.comparePrice ? (
                              <p className="text-xs text-zinc-500 line-through">
                                {formatCurrency(Number(product.comparePrice))}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                                statusStyles[product.status]
                              )}
                            >
                              {formatStatus(product.status)}
                            </span>
                            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                              <Eye className="h-3 w-3" />
                              {product.viewCount} views
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                            <div className="flex flex-wrap justify-start gap-2">
                              {product.status !== "ACTIVE" && canActivate ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={isBusy}
                                  onClick={() => handleStatusChange(product.id, "ACTIVE")}
                                >
                                  Publish
                                </Button>
                              ) : null}
                              {product.status === "ACTIVE" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => handleStatusChange(product.id, "DRAFT")}
                                >
                                  Unpublish
                                </Button>
                              ) : null}
                              {product.status !== "ARCHIVED" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => handleArchive(product.id)}
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  Archive
                                </Button>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                className="h-9 w-28"
                                type="number"
                                min={1}
                                step={1}
                                placeholder="New price"
                                value={priceDrafts[product.id] ?? ""}
                                onChange={(e) =>
                                  setPriceDrafts((c) => ({
                                    ...c,
                                    [product.id]: e.target.value,
                                  }))
                                }
                                disabled={savingPriceFor !== null && savingPriceFor !== product.id}
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingPriceFor === product.id || isBusy}
                                onClick={() => handlePriceUpdate(product.id)}
                              >
                                {savingPriceFor === product.id ? "Saving..." : "Update"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
                  <PackagePlus className="mx-auto h-9 w-9 text-zinc-400" />
                  <p className="mt-3 text-sm font-medium text-zinc-900">
                    No products found
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Create a product or adjust your filters to see listings here.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button asChild>
                      <Link href="/seller/products/new">Create product</Link>
                    </Button>
                    {storeList.length === 0 ? (
                      <Button asChild variant="outline">
                        <Link href="/seller/store">Create store</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}

              {isBusy ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving changes...
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
