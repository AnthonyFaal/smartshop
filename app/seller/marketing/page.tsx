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
  const { data: promotions, isLoading: promotionsLoading } = trpc.promotion.list.useQuery();
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState({ name: "", code: "", value: "", minSubtotal: "", usageLimit: "", startsAt: "", endsAt: "" });
  const [targetProductIds, setTargetProductIds] = useState<string[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const analytics = trpc.promotion.analytics.useQuery({ promotionId: selectedPromotionId ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(selectedPromotionId) });
  const deactivatePromotion = trpc.promotion.deactivate.useMutation({ onSuccess: () => utils.promotion.list.invalidate() });
  const createPromotion = trpc.promotion.create.useMutation({
    onSuccess: () => { setMessage("Discount campaign created."); setError(null); setCampaign({ name: "", code: "", value: "", minSubtotal: "", usageLimit: "", startsAt: "", endsAt: "" }); setTargetProductIds([]); void utils.promotion.list.invalidate(); },
    onError: (err) => { setError(err.message); setMessage(null); },
  });

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
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Discount code campaign</CardTitle><p className="text-sm text-zinc-500">Set a time window and target the active products this code applies to.</p></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(["name", "code", "value", "minSubtotal", "usageLimit", "startsAt", "endsAt"] as const).map((field) => <label key={field} className="space-y-1 text-sm text-zinc-700"><span>{({ name: "Campaign name", code: "Discount code", value: "Discount percentage", minSubtotal: "Minimum order (GHS)", usageLimit: "Usage limit (optional)", startsAt: "Starts (local time)", endsAt: "Ends (local time)" } as const)[field]}</span><Input type={["value", "minSubtotal", "usageLimit"].includes(field) ? "number" : field.includes("At") ? "datetime-local" : "text"} min={field === "value" ? 0.01 : 0} max={field === "value" ? 100 : undefined} placeholder={field === "value" ? "e.g. 15" : undefined} value={campaign[field]} onChange={(event) => setCampaign((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
              <div className="sm:col-span-2 rounded-lg border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-medium text-zinc-800">Target products</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {products?.map((product) => <label key={product.id} className="flex items-center gap-2 text-sm text-zinc-700"><input type="checkbox" checked={targetProductIds.includes(product.id)} onChange={(event) => setTargetProductIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} />{product.title}</label>)}
                </div>
              </div>
              <Button type="button" className="sm:col-span-2" disabled={createPromotion.isPending || !products?.length || targetProductIds.length === 0} onClick={() => { const product = products?.[0]; const startsAt = new Date(campaign.startsAt); const endsAt = new Date(campaign.endsAt); if (!product || campaign.name.trim().length < 2 || campaign.code.trim().length < 3 || !Number.isFinite(Number(campaign.value)) || Number(campaign.value) <= 0 || Number(campaign.value) > 100 || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) { setError("Enter a name, a 3-character code, a percentage from 0–100, and a valid campaign period."); return; } createPromotion.mutate({ storeId: product.store.id, productIds: targetProductIds, name: campaign.name, code: campaign.code, type: "PERCENTAGE", value: Number(campaign.value), minSubtotal: Number(campaign.minSubtotal || 0), usageLimit: campaign.usageLimit ? Number(campaign.usageLimit) : undefined, startsAt, endsAt }); }}>Create campaign</Button>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Campaign performance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {promotionsLoading ? <p className="text-sm text-zinc-500">Loading campaigns...</p> : promotions?.length ? promotions.map((promotion) => <div key={promotion.id} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-zinc-900">{promotion.name} <span className="text-xs text-zinc-500">({promotion.code})</span></p><p className="text-xs text-zinc-500">{promotion.products.length} products · {promotion._count.orders} orders · {promotion.isActive ? "Active" : "Inactive"}</p>{selectedPromotionId === promotion.id && analytics.data ? <p className="mt-1 text-xs text-emerald-700">Revenue {formatCurrency(analytics.data.revenue)} · Discounted {formatCurrency(analytics.data.discountValue)}</p> : null}</div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setSelectedPromotionId(promotion.id)}>Analytics</Button>{promotion.isActive ? <Button type="button" size="sm" variant="outline" onClick={() => deactivatePromotion.mutate({ id: promotion.id })}>Deactivate</Button> : null}</div></div>) : <p className="text-sm text-zinc-500">No discount campaigns yet.</p>}
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
