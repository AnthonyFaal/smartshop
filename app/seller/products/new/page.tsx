"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Sparkles,
  Trash2,
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
   FORM TYPES & CONSTANTS
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

type SizeType = "alpha" | "numeric" | "custom";
type SizeVariant = { size: string; quantity: number };

const ALPHA_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const NUMERIC_SIZES = Array.from({ length: 9 }, (_, i) => (38 + i).toString());

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

  // State
  const [form, setForm] = useState<CreateProductForm>(initialForm);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Variant State
  const [noSizes, setNoSizes] = useState(false);
  const [sizeType, setSizeType] = useState<SizeType>("alpha");
  const [variants, setVariants] = useState<SizeVariant[]>([{ size: "S", quantity: 1 }]);

  const canUseAi = canUseAiFeatures(
    (me?.subscription?.plan ?? "FREE") as Parameters<typeof canUseAiFeatures>[0]
  );

  /* -----------------------------
     STORE SELECTION
  ------------------------------*/
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
     VARIANT HANDLERS
  ------------------------------*/
  const addVariant = () => setVariants((v) => [...v, { size: "", quantity: 1 }]);
  const removeVariant = (index: number) => setVariants((v) => v.filter((_, i) => i !== index));

  const sizeOptions = () => {
    if (sizeType === "alpha") return ALPHA_SIZES;
    if (sizeType === "numeric") return NUMERIC_SIZES;
    return [];
  };

  const usedSizes = new Set(variants.map((v) => v.size.trim()).filter(Boolean));

  const updateVariant = (index: number, key: keyof SizeVariant, value: string | number) => {
    setVariants((prev) => {
      const next = [...prev];
      const nextRow = { ...next[index], [key]: value };

      // Enforce uniqueness when setting size (no duplicate sizes across rows)
      if (key === "size") {
        const chosen = String(value).trim();
        for (let i = 0; i < next.length; i++) {
          if (i !== index && next[i].size.trim() === chosen && chosen) {
            next[i] = { ...next[i], size: "" };
          }
        }
      }

      next[index] = nextRow;
      return next;
    });
  };

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
        category: categories?.find((c) => c.id === form.categoryId)?.name ?? "",
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
      setError("Select a store before creating this product, or create your store first.");
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

    const sizesQuantities = noSizes
      ? undefined
      : variants
          .filter((v) => v.size.trim() !== "")
          .map((v) => ({ size: v.size.trim(), quantity: Number(v.quantity) }));

    try {
      await createProduct.mutateAsync({
        storeId: selectedStoreId,
        categoryId: form.categoryId || undefined,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        stock: Number(form.stock || 0),
        sizesQuantities,
        images: images.length > 0 ? images : ["https://placehold.co/600x600/png"],
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sku,
      });

      setSuccess("Product created successfully.");
      setForm(initialForm);
      setVariants([{ size: "S", quantity: 1 }]);
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
              <p className="text-sm text-zinc-500">Add a new listing to your store.</p>
            </div>

            <Button asChild variant="outline">
              <Link href="/seller/products">Back</Link>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Basic Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic details</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <textarea
                      className="h-32 w-full rounded-md border px-3 py-2 text-sm"
                      value={form.description}
                      onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
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

              {/* Pricing Section */}
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
                      onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Compare price</Label>
                    <Input
                      type="number"
                      value={form.comparePrice}
                      onChange={(e) => setForm((c) => ({ ...c, comparePrice: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>SKU (optional)</Label>
                    <Input
                      value={form.sku}
                      onChange={(e) => setForm((c) => ({ ...c, sku: e.target.value }))}
                    />
                    <p className="text-xs text-zinc-500 mt-1">Auto-generated if empty</p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noSizes}
                        onChange={(e) => setNoSizes(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Product has no sizes/variants</span>
                    </Label>
                  </div>

                  {noSizes && (
                    <div className="sm:col-span-2">
                      <Label>Total Stock</Label>
                      <Input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm((c) => ({ ...c, stock: e.target.value }))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Variants Section */}
              {!noSizes && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Variants</CardTitle>
                      <select
                        className="rounded-md border px-2 py-1 text-sm"
                        value={sizeType}
                        onChange={(e) => setSizeType(e.target.value as SizeType)}
                      >
                        <option value="alpha">Alpha (S, M, L)</option>
                        <option value="numeric">Numeric (38-46)</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {variants.map((variant, index) => (
                      <div key={index} className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label>Size</Label>
                          {sizeType === "custom" ? (
                            <Input
                              value={variant.size}
                              onChange={(e) => updateVariant(index, "size", e.target.value)}
                              placeholder="e.g. One Size"
                            />
                          ) : (() => {
                            const current = variant.size.trim();
                            const options = sizeOptions().filter((opt) => {
                              if (!opt) return false;
                              if (current && opt === current) return true;
                              return !usedSizes.has(opt);
                            });

                            return (
                              <select
                                className="w-full mt-1 rounded-md border px-2 py-1 text-sm"
                                value={variant.size}
                                onChange={(e) => updateVariant(index, "size", e.target.value)}
                              >
                                <option value="">Select</option>
                                {options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </div>

                        <div className="w-24">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            value={variant.quantity}
                            onChange={(e) => updateVariant(index, "quantity", e.target.value)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add size
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">

              <Card>
                              <CardHeader>
                                <CardTitle>Store settings</CardTitle>
                              </CardHeader>
              
                              <CardContent className="space-y-4">
              
                              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                                <div>
                                  <Label>Category</Label>
                                  <select
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                    value={form.categoryId}
                                    onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))}
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
                                  <Label>Tags (comma separated)</Label>
                                  <Input
                                    value={form.tags}
                                    onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))}
                                  />
                                </div>
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
                              </CardContent>
                            </Card>
                            
              {/* Media Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Media</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <label className="block cursor-pointer rounded-xl border border-dashed p-4 text-center hover:bg-zinc-50 transition-colors">
                    <div className="flex justify-center mb-2">
                      <Plus className="text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium">Upload images</p>
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={(e) => handleUploadImages(e.target.files)}
                    />
                  </label>

                  {uploading && <p className="text-sm text-zinc-500 text-center">Uploading...</p>}

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {uploadedImages.map((url) => (
                        <div
                          key={url}
                          className="relative h-24 w-full overflow-hidden rounded-md border"
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
                </CardContent>
              </Card>

              {/* Status Messages */}
              <div className="flex flex-col gap-2">
                {error && <div className="text-sm font-medium text-red-600">{error}</div>}
                {success && <div className="text-sm font-medium text-green-600">{success}</div>}
              </div>

              {/* Submit Action */}
              <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
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