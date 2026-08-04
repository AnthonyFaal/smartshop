
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, ChevronDown, ChevronUp, Loader2, Save, Search, XCircle } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SellerInventoryPage() {
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.product.sellerList.useQuery({});
  
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [draftVariantStock, setDraftVariantStock] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "out">("all");
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const updateProduct = trpc.product.update.useMutation({
    onSuccess: async (_, variables) => {
      await utils.product.sellerList.invalidate();
      await utils.auth.sellerDashboard.invalidate();
      setDraftStock((curr) => {
        const next = { ...curr };
        delete next[variables.id];
        return next;
      });
      triggerSuccess(variables.id);
    },
  });
  const toggleExpand = (productId: string) => {
    setExpandedProducts((current) => ({
      ...current,
      [productId]: !current[productId],
    }));
  };

  const updateVariantStocks = trpc.product.updateVariantStocks.useMutation({
    onSuccess: async (_, variables) => {
      await utils.product.sellerList.invalidate();
      await utils.auth.sellerDashboard.invalidate();
      setDraftVariantStock((curr) => {
        const next = { ...curr };
        variables.variants.forEach((v) => delete next[v.id]);
        return next;
      });
      triggerSuccess(variables.variants[0]?.id ?? null);
    },
  });

  const triggerSuccess = (id: string | null) => {
    if (!id) return;
    setSuccessId(id);
    setTimeout(() => setSuccessId(null), 2500);
  };

  const productList = products ?? [];

  const stats = useMemo(
    () =>
      productList.reduce(
        (current, product) => {
          const effectiveStock = product.effectiveStock ?? product.stock;
          current.units += effectiveStock;
          if (effectiveStock <= 0) current.out += 1;
          if (effectiveStock > 0 && effectiveStock <= 5) current.low += 1;
          return current;
        },
        { units: 0, low: 0, out: 0 }
      ),
    [productList]
  );

  // Frontend contains search & filter logic
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return productList.filter((product) => {
      const effectiveStock = product.effectiveStock ?? product.stock;
      const titleContains = product.title?.toLowerCase().includes(query) ?? false;
      const storeContains = product.store?.name?.toLowerCase().includes(query) ?? false;
      const matchesSearch = query === "" || titleContains || storeContains;
      
      if (!matchesSearch) return false;
      if (filterStatus === "out") return effectiveStock <= 0;
      if (filterStatus === "low") return effectiveStock > 0 && effectiveStock <= 5;
      return true;
    });
  }, [productList, searchQuery, filterStatus]);

  const saveStock = async (id: string, value: string) => {
    setError(null);
    const stock = Number(value);

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a whole number of 0 or more.");
      return;
    }

    try {
      await updateProduct.mutateAsync({ id, stock });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update stock."));
    }
  };

  const saveVariantStock = async (productId: string, variantId: string, value: string) => {
    setError(null);
    const quantity = Number(value);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Variant stock must be a whole number of 0 or more.");
      return;
    }

    try {
      await updateVariantStocks.mutateAsync({
        productId,
        variants: [{ id: variantId, quantity }],
      });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Unable to update variant stock."));
    }
  };

  const renderStockBadge = (stockVal: number) => {
    if (stockVal <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          <XCircle className="h-3.5 w-3.5" /> Out of stock
        </span>
      );
    }
    if (stockVal <= 5) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" /> Low stock ({stockVal})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <Boxes className="h-3.5 w-3.5" /> In stock ({stockVal})
      </span>
    );
  };

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/inventory">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Inventory</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Track stock levels and update availability from one place.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller/products">Manage products</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Total units</p>
                <p className="mt-2 text-2xl font-semibold">{stats.units}</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer transition hover:border-amber-400"
              onClick={() => setFilterStatus(filterStatus === "low" ? "all" : "low")}
            >
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Low stock (click to filter)</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">{stats.low}</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer transition hover:border-red-400"
              onClick={() => setFilterStatus(filterStatus === "out" ? "all" : "out")}
            >
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Out of stock (click to filter)</p>
                <p className="mt-2 text-2xl font-semibold text-red-700">{stats.out}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <CardTitle className="text-base">Stock overview</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    placeholder="Search by title or store..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                {filterStatus !== "all" || searchQuery !== "" ? (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setSearchQuery(""); }}>
                    Reset
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? (
                <div className="rounded-md bg-red-50 p-3 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : null}

              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded bg-zinc-100" />
                  <div className="h-16 animate-pulse rounded bg-zinc-100" />
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {filteredProducts.map((product) => {
                    const effectiveStock = product.effectiveStock ?? product.stock;
                    const hasVariants = (product.variants?.length ?? 0) > 0;
                    const isExpanded = expandedProducts[product.id] ?? true; // Default expanded, toggle to collapse                    

                    if (hasVariants) {
                      return (
                        <div key={product.id} className="space-y-3 p-4">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900"
                                onClick={() => toggleExpand(product.id)}
                                aria-label={`Toggle variants for ${product.title}`}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <div>
                                <p className="font-medium text-zinc-900">{product.title}</p>
                                <p className="mt-1 text-sm text-zinc-500">
                                  {product.store.name} · {product.status} ({product.variants.length} variants)
                                </p>
                              </div>
                            </div>
                            <div>{renderStockBadge(effectiveStock)}</div>
                          </div>

                          {isExpanded && (
                            <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-zinc-50/50 ml-9">
                               {product.variants.map((variant) => {
                                const value = draftVariantStock[variant.id] ?? String(variant.quantity);
                                const changed = value !== String(variant.quantity);
                                const isSuccess = successId === variant.id;

                                return (
                                  <div key={variant.id} className="grid gap-3 p-3 sm:grid-cols-3 sm:items-center">
                                    <div>
                                      <p className="font-medium text-sm text-zinc-900">{variant.size}</p>
                                      <p className="text-xs text-zinc-500">Variant</p>
                                    </div>
                                    <div>{renderStockBadge(variant.quantity)}</div>

                                    <div className="flex items-center gap-2 justify-end">
                                      <div className="w-24">
                                        <Input
                                          id={`variant-${variant.id}`}
                                          type="number"
                                          min={0}
                                          value={value}
                                          className="h-8 text-sm"
                                          onChange={(event) =>
                                            setDraftVariantStock((current) => ({
                                              ...current,
                                              [variant.id]: event.target.value,
                                            }))
                                          }
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={changed ? "default" : "outline"}
                                        disabled={!changed || updateVariantStocks.isPending}
                                        onClick={() => saveVariantStock(product.id, variant.id, value)}
                                        aria-label={`Save variant stock for ${variant.size}`}
                                        className="h-8 px-3"
                                      >
                                        {updateVariantStocks.isPending ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : isSuccess ? (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                          <Save className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Simple product code remains the same...
                    const value = draftStock[product.id] ?? String(product.stock);
                    const changed = value !== String(product.stock);
                    const isSuccess = successId === product.id;

                    return (
                      <div key={product.id} className="grid gap-4 p-4 sm:grid-cols-3 sm:items-center">
                        <div>
                          <p className="font-medium text-sm text-zinc-900">{product.title}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {product.store.name} · {product.status}
                          </p>
                        </div>
                        <div>{renderStockBadge(effectiveStock)}</div>

                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-28">
                            <Input
                              id={`stock-${product.id}`}
                              type="number"
                              min={0}
                              value={value}
                              className="h-8 text-sm"
                              onChange={(event) =>
                                setDraftStock((current) => ({
                                  ...current,
                                  [product.id]: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={changed ? "default" : "outline"}
                            disabled={!changed || updateProduct.isPending}
                            onClick={() => saveStock(product.id, value)}
                            aria-label={`Save stock for ${product.title}`}
                            className="h-8 px-3"
                          >
                            {updateProduct.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isSuccess ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
                  <Boxes className="mx-auto h-9 w-9 text-zinc-400" />
                  <p className="mt-3 text-sm font-medium">No matching inventory found</p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/seller/products/new">Create product</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
