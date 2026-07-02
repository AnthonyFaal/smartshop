"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { canUseAiFeatures } from "@/lib/config/subscriptions";

/* -----------------------------
   SKU GENERATOR
------------------------------*/
function generateSku(title: string, storeId?: string) {
  const clean = title
    .replace(/[^a-zA-Z0-9]/g, "-")
    .slice(0, 10)
    .toUpperCase();

  const shortStore = storeId?.slice(0, 6).toUpperCase() ?? "STORE";
  const timestamp = Date.now().toString().slice(-4);

  return `${shortStore}-${clean}-${timestamp}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/* -----------------------------
   FORM TYPE
------------------------------*/
type CreateProductForm = {
  title: string;
  description: string;
  price: string;
  comparePrice: string;
  stock: string;
  categoryId: string;
  imageUrls: string;
  storeId: string;
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
  imageUrls: "",
  storeId: "",
  tags: "",
  sku: "",
};

export default function SellerProductNewPage() {
  const utils = trpc.useUtils();

  const { data: me } = trpc.auth.me.useQuery();
  const { data: dashboard } = trpc.auth.sellerDashboard.useQuery();

  const { data: categories } = trpc.product.categories.useQuery();
  const { data: stores, isLoading: storesLoading } = trpc.store.list.useQuery();

  const generateListing = trpc.ai.generateListing.useMutation();

  const createProduct = trpc.product.create.useMutation({
    onSuccess: async () => {
      await utils.auth.sellerDashboard.invalidate();
      await utils.product.list.invalidate();
    },
  });

  const [form, setForm] = useState<CreateProductForm>(initialForm);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canUseAi = canUseAiFeatures(
    (me?.subscription?.plan ?? "FREE") as Parameters<typeof canUseAiFeatures>[0]
  );

  const storeOptions = stores ?? [];
  const hasStores = storeOptions.length > 0;
  const dashboardStoreId = dashboard?.store?.id;
  const defaultStoreId =
    storeOptions.find((store) => store.id === dashboardStoreId)?.id ??
    storeOptions[0]?.id ??
    "";
  const selectedStoreId = storeOptions.some((store) => store.id === form.storeId)
    ? form.storeId
    : defaultStoreId;
  const isSubmitDisabled =
    createProduct.isPending || storesLoading || !selectedStoreId;

  /* -----------------------------
     IMAGE UPLOAD
  ------------------------------*/
  const handleUploadImages = async (files: FileList | null) => {
    if (!files?.length) return;

    setUploading(true);
    setError(null);

    try {
      const uploaded: string[] = [];

      for (const file of Array.from(files)) {
        const data = new FormData();
        data.append("file", file);
        data.append("pathPrefix", "product-images");

        const res = await fetch("/api/uploads/public-image", {
          method: "POST",
          body: data,
        });

        if (!res.ok) throw new Error("Upload failed");

        const json = await res.json();
        uploaded.push(json.publicUrl);
      }

      setUploadedImages((c) => [...c, ...uploaded]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Upload error"));
    } finally {
      setUploading(false);
    }
  };

  /* -----------------------------
     AI DESCRIPTION
  ------------------------------*/
  const handleGenerateListing = async () => {
    setError(null);

    try {
      const result = await generateListing.mutateAsync({
        productName: form.title,
        category:
          categories?.find((c) => c.id === form.categoryId)?.name ?? "",
        condition: "New",
      });

      setForm((c) => ({ ...c, description: result.result }));
      setSuccess("Description generated.");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "AI generation failed"));
    }
  };

  /* -----------------------------
     SUBMIT
  ------------------------------*/
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    if (!form.title || !form.price) {
      setError("Title and price are required.");
      return;
    }

    if (!selectedStoreId) {
      setError(
        "Select a store before creating this product, or create your store first."
      );
      return;
    }

    const images = [
      ...uploadedImages,
      ...form.imageUrls
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean),
    ];

    const sku = form.sku?.trim() || generateSku(form.title, selectedStoreId);

    try {
      await createProduct.mutateAsync({
        storeId: selectedStoreId,
        categoryId: form.categoryId || undefined,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice
          ? Number(form.comparePrice)
          : undefined,
        stock: Number(form.stock || 0),
        images:
          images.length > 0
            ? images
            : ["https://placehold.co/600x600/png"],
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sku,
      });

      setSuccess("Product created successfully.");
      setForm(initialForm);
      setUploadedImages([]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Create failed"));
    }
  };

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/products">
        <div className="mx-auto max-w-5xl px-4 py-10">

          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Create product</h1>
              <p className="text-sm text-zinc-500">
                Add a new listing to your store.
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/seller/products">Back</Link>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">

            {/* LEFT */}
            <div className="space-y-6">

              <Card>
                <CardHeader>
                  <CardTitle>Basic details</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">

                  <div>
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, title: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <textarea
                      className="h-32 w-full rounded-md border px-3 py-2 text-sm"
                      value={form.description}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {canUseAi && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerateListing}
                      disabled={!form.title || !form.categoryId}
                      className="w-full"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI description
                    </Button>
                  )}

                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing & stock</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, price: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Compare price</Label>
                    <Input
                      type="number"
                      value={form.comparePrice}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          comparePrice: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={form.stock}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, stock: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label>SKU (optional)</Label>
                    <Input
                      value={form.sku}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, sku: e.target.value }))
                      }
                    />
                    <p className="text-xs text-zinc-500">
                      Auto-generated if empty
                    </p>
                  </div>

                </CardContent>
              </Card>

            </div>

            {/* RIGHT */}
            <div className="space-y-6">

              <Card>
                <CardHeader>
                  <CardTitle>Store settings</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">

                  <div>
                    <Label>Category</Label>

                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          categoryId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select category</option>
                      {categories?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                  </div>

                  <div>
                    <Label>Store</Label>
                    <div className="mt-1 flex items-center gap-3">
                      {storesLoading ? (
                        <div className="text-sm text-zinc-500">Loading stores...</div>
                      ) : hasStores ? (
                        <select
                          className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                          value={selectedStoreId}
                          onChange={(e) =>
                            setForm((c) => ({ ...c, storeId: e.target.value }))
                          }
                        >
                          <option value="">Select store</option>
                          {storeOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-zinc-500">No stores yet</div>
                      )}

                      <Button variant="outline" asChild size="sm">
                        <Link href="/seller/store">Create store</Link>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <Input
                      value={form.tags}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, tags: e.target.value }))
                      }
                    />
                  </div>

                </CardContent>
              </Card>

              {/* IMAGE UPLOAD (RESTORED) */}
              <Card>
                <CardHeader>
                  <CardTitle>Media</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">

                  <label className="block cursor-pointer rounded-xl border border-dashed p-4 text-center">
                    <div className="flex justify-center mb-2">
                      <Plus />
                    </div>
                    <p className="text-sm">Upload images</p>
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={(e) => handleUploadImages(e.target.files)}
                    />
                  </label>

                  {uploading && (
                    <p className="text-sm text-zinc-500">
                      Uploading...
                    </p>
                  )}

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedImages.map((url) => (
                        <div
                          key={url}
                          className="relative h-24 w-full overflow-hidden rounded-md"
                        >
                          <Image
                            src={url}
                            alt="Uploaded product preview"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    className="w-full border rounded-md p-2 text-sm"
                    placeholder="Image URLs (optional)"
                    value={form.imageUrls}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        imageUrls: e.target.value,
                      }))
                    }
                  />

                </CardContent>
              </Card>

              {/* STATUS */}
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}

              {success && (
                <div className="text-sm text-green-600">{success}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitDisabled}
              >
                {createProduct.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create product
              </Button>

            </div>
          </form>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
