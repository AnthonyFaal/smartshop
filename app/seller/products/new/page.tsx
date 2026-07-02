"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

type CreateProductForm = {
  title: string;
  description: string;
  price: string;
  comparePrice: string;
  stock: string;
  categoryId: string;
  storeId: string;
  images: string;
  tags: string;
  sku: string;
};

const initialForm: CreateProductForm = {
  title: "",
  description: "",
  price: "",
  comparePrice: "",
  stock: "1",
  categoryId: "",
  storeId: "",
  images: "",
  tags: "",
  sku: "",
};

export default function SellerProductNewPage() {
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const { data: dashboard } = trpc.auth.sellerDashboard.useQuery();
  const createProduct = trpc.product.create.useMutation({
    onSuccess: async () => {
      await utils.auth.sellerDashboard.invalidate();
      await utils.product.list.invalidate();
    },
  });

  const [form, setForm] = useState<CreateProductForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (dashboard?.store?.id) {
      setForm((current) => ({ ...current, storeId: dashboard.store!.id }));
    }
  }, [dashboard?.store?.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.title || !form.description || !form.price || !form.storeId) {
      setError("Please fill in the required fields before creating your listing.");
      return;
    }

    const images = form.images
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      await createProduct.mutateAsync({
        storeId: form.storeId,
        categoryId: form.categoryId || undefined,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        stock: Number(form.stock || 0),
        images: images.length ? images : ["https://placehold.co/600x600/png"],
        tags: form.tags.split(",").map((value) => value.trim()).filter(Boolean),
        sku: form.sku || undefined,
      });
      setSuccess("Your product listing has been created.");
      setForm(initialForm);
    } catch (err: any) {
      setError(err?.message ?? "Unable to create the product right now.");
    }
  };

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/products">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Create product</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Add a product listing and stay within your plan limits.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller/products">Back to products</Link>
            </Button>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                You have used {dashboard?.productUsage.used ?? 0} of {dashboard?.productUsage.limitLabel ?? "Infinity"} products on your current plan.
              </span>
            </div>
            {!dashboard?.productUsage.canCreateProduct && (
              <p className="mt-2 text-emerald-700">
                Your current plan limit has been reached. Upgrade to add more listings.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Listing details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea className="min-h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Price (GHS)</Label>
                    <Input type="number" min="0" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Compare price (optional)</Label>
                    <Input type="number" min="0" value={form.comparePrice} onChange={(event) => setForm((current) => ({ ...current, comparePrice: event.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Stock</Label>
                    <Input type="number" min="0" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU (optional)</Label>
                    <Input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Store & visibility</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Store</Label>
                  <select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.storeId} onChange={(event) => setForm((current) => ({ ...current, storeId: event.target.value }))}>
                    <option value="">Select a store</option>
                    <option value={dashboard?.store?.id ?? ""}>{dashboard?.store?.name ?? "Default store"}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                    <option value="">Select a category</option>
                    <option value="e6eada8d-4f47-47df-85b9-1c888d3f5f7d">Electronics</option>
                    <option value="0edff239-e0f8-4ebd-8f38-a24c14717449">Books & Stationery</option>
                    <option value="ca45e8ee-0607-4d1e-9b18-cb7ae1e98f90">Fashion</option>
                    <option value="0f26f346-7de5-4ac5-8fd3-7b2c0df9d5be">Food & Beverages</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Images (one URL per line)</Label>
                  <textarea className="min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.images} onChange={(event) => setForm((current) => ({ ...current, images: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} />
                </div>
                {error ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
                {success ? (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                ) : null}
                <Button type="submit" className="w-full" disabled={createProduct.isPending || !dashboard?.productUsage.canCreateProduct}>
                  {createProduct.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} 
                  Create listing
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
