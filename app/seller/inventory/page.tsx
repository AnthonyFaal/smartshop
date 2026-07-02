"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, Loader2, Save } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SellerInventoryPage() {
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.product.sellerList.useQuery({});
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const updateProduct = trpc.product.update.useMutation({
    onSuccess: async () => {
      await utils.product.sellerList.invalidate();
      await utils.auth.sellerDashboard.invalidate();
      setDraftStock({});
    },
  });

  const productList = useMemo(() => products ?? [], [products]);
  const stats = useMemo(
    () =>
      productList.reduce(
        (current, product) => {
          current.units += product.stock;
          if (product.stock <= 0) current.out += 1;
          if (product.stock > 0 && product.stock <= 5) current.low += 1;
          return current;
        },
        { units: 0, low: 0, out: 0 }
      ),
    [productList]
  );

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
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Low stock</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">{stats.low}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-500">Out of stock</p>
                <p className="mt-2 text-2xl font-semibold text-red-700">{stats.out}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Stock overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded bg-zinc-100" />
                  <div className="h-16 animate-pulse rounded bg-zinc-100" />
                  <div className="h-16 animate-pulse rounded bg-zinc-100" />
                </div>
              ) : productList.length > 0 ? (
                <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                  {productList.map((product) => {
                    const value = draftStock[product.id] ?? String(product.stock);
                    const changed = value !== String(product.stock);

                    return (
                      <div key={product.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_0.7fr_0.8fr] lg:items-center">
                        <div>
                          <p className="font-medium text-zinc-900">{product.title}</p>
                          <p className="mt-1 text-sm text-zinc-500">{product.store.name} · {product.status}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {product.stock <= 5 ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Boxes className="h-4 w-4 text-zinc-400" />}
                          <span>{product.stock <= 0 ? "Out of stock" : product.stock <= 5 ? "Low stock" : "In stock"}</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label htmlFor={`stock-${product.id}`}>Stock</Label>
                            <Input
                              id={`stock-${product.id}`}
                              type="number"
                              min={0}
                              value={value}
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
                            size="icon"
                            variant={changed ? "default" : "outline"}
                            disabled={!changed || updateProduct.isPending}
                            onClick={() => saveStock(product.id, value)}
                            aria-label={`Save stock for ${product.title}`}
                          >
                            {updateProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
                  <Boxes className="mx-auto h-9 w-9 text-zinc-400" />
                  <p className="mt-3 text-sm font-medium">No inventory yet</p>
                  <Button asChild className="mt-4">
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
