"use client";

import Link from "next/link";
import { Loader2, Megaphone, Tag } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";
import { useState } from "react";

export default function SellerMarketingPage() {
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.product.sellerList.useQuery({ status: "ACTIVE" });
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProduct = trpc.product.update.useMutation({
    onSuccess: async () => {
      await utils.product.sellerList.invalidate();
      setMessage("Promotion price saved.");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setMessage(null);
    },
  });

  function savePrice(productId: string) {
    const price = Number(priceDrafts[productId]);
    if (!Number.isFinite(price) || price < 1) {
      setError("Enter a valid sale price.");
      setMessage(null);
      return;
    }
    setMessage(null);
    setError(null);
    updateProduct.mutate({ id: productId, price });
  }

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/marketing">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Marketing</h1>
              <p className="mt-1 text-sm text-zinc-500">Create sale prices that are shown clearly to buyers.</p>
            </div>
            <Button asChild variant="outline"><Link href="/seller">Back to dashboard</Link></Button>
          </div>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700"><Megaphone className="h-5 w-5" /></div>
              <div><CardTitle className="text-base">Sale pricing</CardTitle><p className="mt-1 text-sm text-zinc-500">Lowering a product price automatically keeps its previous price as the comparison price.</p></div>
            </CardHeader>
            <CardContent>
              {message && <p className="mb-4 text-sm text-emerald-700">{message}</p>}
              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading active products...</div>
              ) : !products?.length ? (
                <p className="text-sm text-zinc-500">You need an active product before creating a promotion.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {products.map((product) => {
                    const currentPrice = Number(product.price);
                    const comparePrice = product.comparePrice == null ? null : Number(product.comparePrice);
                    return (
                      <div key={product.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0"><p className="truncate font-medium text-zinc-900">{product.title}</p><p className="mt-1 text-sm text-zinc-500">Current price: {formatCurrency(currentPrice)}{comparePrice && comparePrice > currentPrice ? ` · Was ${formatCurrency(comparePrice)}` : ""}</p></div>
                        <div className="flex w-full items-center gap-2 sm:w-auto"><div className="relative w-full sm:w-40"><Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input className="pl-9" type="number" min={1} placeholder="Sale price" value={priceDrafts[product.id] ?? ""} onChange={(event) => setPriceDrafts((current) => ({ ...current, [product.id]: event.target.value }))} /></div><Button type="button" onClick={() => savePrice(product.id)} disabled={updateProduct.isPending}>Save</Button></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
