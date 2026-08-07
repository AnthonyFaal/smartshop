"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Select } from "@/components/ui/select";
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

  const router = useRouter();
  const generateListing = trpc.ai.generateListing.useMutation();

  const createProduct = trpc.product.create.useMutation({
    onSuccess: async () => {
      await utils.auth.sellerDashboard.invalidate();
      await utils.product.list.invalidate();
    },
  });

  // State
  const [form, setForm] = useState<CreateProductForm>(initialForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Variant State
  const [noSizes, setNoSizes] = useState(false);
  const [sizeType, setSizeType] = useState<SizeType>("alpha");
  const [variants, setVariants] = useState<SizeVariant[]>([{ size: "S", quantity: 1 }]);

  const subscriptionPlan =
    (me?.subscription?.plan ?? "FREE") as Parameters<typeof canUseAiFeatures>[0];
  const subscriptionStatus = me?.subscription?.status ?? "EXPIRED";
  const canUseAi =
    canUseAiFeatures(subscriptionPlan) && subscriptionStatus === "ACTIVE";

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
  const handleSelectImages = (files: FileList | null) => {
    if (!files?.length) return;

    setError(null);
    const nextFiles = Array.from(files);

    setPreviewUrls((current) => {
      current.forEach(URL.revokeObjectURL);
      return nextFiles.map((file) => URL.createObjectURL(file));
    });
    setSelectedFiles(nextFiles);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedFiles((current) => current.filter((_, i) => i !== index));
    setPreviewUrls((current) => {
      const next = current.filter((_, i) => i !== index);
      if (current[index]) URL.revokeObjectURL(current[index]);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach(URL.revokeObjectURL);
    };
  }, [previewUrls]);

  /* -----------------------------
     AI DESCRIPTION
  ------------------------------*/
  const handleGenerateListing = async () => {
    if (generateListing.isPending) return;
    setError(null);
    setSuccess(null);

    try {
      const result = await generateListing.mutateAsync({
        productName: form.title,
        category: categories?.find((c) => c.id === form.categoryId)?.name ?? "",
        condition: "New",
      });

      const raw = typeof result?.result === "string" ? result.result : "";

      // Helper: remove common markdown/bullet artifacts to keep description UI clean.
      const cleanPlainText = (text: string) => {
        return text
          .replace(/\r\n/g, "\n")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.replace(/^(\*|-|\+)\s+/, "")) // strip leading bullets
          .join("\n\n");
      };

      type ListingGen = {
        title?: string;
        description?: string;
        tags?: string[];
        priceRange?: { min?: number; max?: number };
      };

      let parsed: ListingGen | null = null;

      try {
        parsed = JSON.parse(raw) as ListingGen;
      } catch {
        parsed = null;
      }

      setForm((c) => {
        // Always improve: keep user-entered values if AI doesn’t provide them.
        const nextTitle =
          typeof parsed?.title === "string" && parsed.title.trim().length > 0
            ? parsed.title.trim()
            : c.title;

        const nextDescription =
          typeof parsed?.description === "string" && parsed.description.trim().length > 0
            ? cleanPlainText(parsed.description)
            : c.description;

        const nextTagsArr = Array.isArray(parsed?.tags)
          ? parsed.tags.filter((t) => typeof t === "string" && t.trim().length > 0)
          : null;

        const nextTags =
          nextTagsArr && nextTagsArr.length > 0
            ? nextTagsArr.map((t) => t.trim()).join(", ")
            : c.tags;

        // Optionally set price only if user hasn’t entered one yet.
        const nextPrice =
          (!c.price || c.price.trim() === "") && parsed?.priceRange?.min !== undefined
            ? String(parsed.priceRange.min)
            : c.price;

        return {
          ...c,
          title: nextTitle,
          description: nextDescription,
          tags: nextTags,
          price: nextPrice,
        };
      });

      setSuccess("Listing details generated.");
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

    const priceN = Number(form.price);
    if (!Number.isFinite(priceN) || priceN < 1) {
      setError("Price must be at least 1.");
      return;
    }

    const comparePriceN = form.comparePrice?.toString().trim()
      ? Number(form.comparePrice)
      : null;
    if (comparePriceN !== null && (!Number.isFinite(comparePriceN) || comparePriceN < 1)) {
      setError("Compare price must be at least 1.");
      return;
    }

    if (comparePriceN !== null && comparePriceN <= priceN) {
        setError("Was price must be higher than current price.");
        return;
      }

    if (!selectedStoreId) {
      setError("Select a store before creating this product, or create your store first.");
      return;
    }

    const externalImages = form.imageUrls
      .split(/\n|,/) 
      .map((s) => s.trim())
      .filter(Boolean);

    const uploadedFiles: Array<{ bucket: string; storageKey: string; publicUrl: string }> = [];
    let uploadedImageUrls: string[] = [];
    let images: string[] = [];
    let sizesQuantities = noSizes
      ? undefined
      : variants
          .filter((v) => v.size.trim() !== "")
          .map((v) => ({ size: v.size.trim(), quantity: Number(v.quantity) }));

    if (noSizes) {
      const stockN = Number(form.stock || 0);
      if (!Number.isFinite(stockN) || stockN < 1) {
        setError("Stock must be at least 1.");
        return;
      }
    } else {
      for (const v of variants) {
        if (v.size.trim().length === 0) continue;
        const qN = Number(v.quantity);
        if (!Number.isFinite(qN) || qN < 1) {
          setError("Variant quantity must be at least 1.");
          return;
        }
      }
    }

    setUploading(true);
    try {
      if (selectedFiles.length > 0) {
        uploadedImageUrls = await Promise.all(
          selectedFiles.map(async (file) => {
            const data = new FormData();
            data.append("file", file);
            data.append("pathPrefix", "product-images");
            data.append("bucketType", "product");

            const res = await fetch("/api/uploads/public-image", {
              method: "POST",
              body: data,
            });

            if (!res.ok) {
              const json = await res.json().catch(() => null);
              throw new Error(json?.error || `Failed to upload ${file.name}`);
            }

            const json = await res.json();
            uploadedFiles.push({
              bucket: json.bucket,
              storageKey: json.storageKey,
              publicUrl: json.publicUrl,
            });
            return json.publicUrl as string;
          })
        );
      }

      images = [...uploadedImageUrls, ...externalImages];
      const sku = form.sku?.trim() || generateSku(form.title, selectedStoreId);

      await createProduct.mutateAsync({
        storeId: selectedStoreId,
        categoryId: form.categoryId || undefined,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        stock: noSizes ? 1 : Number(form.stock), // server requires stock; variants-mode ignores it but keeps schema happy
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
      setSelectedFiles([]);
      previewUrls.forEach(URL.revokeObjectURL);
      setPreviewUrls([]);
      router.push("/seller/products");
    } catch (e: unknown) {
      if (uploadedFiles.length > 0) {
        await Promise.all(
          uploadedFiles.map(async (uploaded) => {
            await fetch("/api/uploads/public-image", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bucket: uploaded.bucket,
                storageKey: uploaded.storageKey,
              }),
            }).catch(() => null);
          })
        );
      }
      setError(getErrorMessage(e, "Create failed"));
    } finally {
      setUploading(false);
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
                  <CardTitle></CardTitle>
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
                      disabled={
                        generateListing.isPending || !form.title || !form.categoryId
                      }
                      className="w-full"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {generateListing.isPending ? "Generating..." : "Generate AI description"}
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
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={form.price}
                      onChange={(e) => {
                        const next = e.target.value;
                        setForm((c) => ({ ...c, price: next }));
                      }}
                      onBlur={() => {
                        const n = Number(form.price);
                        if (!Number.isFinite(n) || n < 1) setForm((c) => ({ ...c, price: "1" }));
                      }}
                    />
                  </div>

                  <div>
                    <Label>Was price (optional)</Label>
                    
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={form.comparePrice}
                      onChange={(e) => {
                        const next = e.target.value;
                        setForm((c) => ({ ...c, comparePrice: next }));
                      }}
                      onBlur={() => {
                        if (!form.comparePrice?.toString().trim()) return;
                        const n = Number(form.comparePrice);
                        if (!Number.isFinite(n) || n < 1) setForm((c) => ({ ...c, comparePrice: "1" }));
                      }}
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
                        inputMode="numeric"
                        min={1}
                        step={1}
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
                      <Select
                        className="w-auto min-w-[10rem]"
                        value={sizeType}
                        onChange={(e) => setSizeType(e.target.value as SizeType)}
                      >
                        <option value="alpha">Alpha (S, M, L)</option>
                        <option value="numeric">Numeric (38-46)</option>
                        <option value="custom">Custom</option>
                      </Select>
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
                              <Select
                                className="mt-1"
                                value={variant.size}
                                onChange={(e) => updateVariant(index, "size", e.target.value)}
                              >
                                <option value="">Select</option>
                                {options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </Select>
                            );
                          })()}
                        </div>

                        <div className="w-24">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            step={1}
                            value={variant.quantity}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = Number(raw);
                              updateVariant(
                                index,
                                "quantity",
                                Number.isFinite(n) && n >= 1 ? raw : "1"
                              );
                            }}
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
                                  <Select
                                    value={form.categoryId}
                                    onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))}
                                  >
                                    <option value="">Select category</option>
                                    {categories?.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </Select>
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
                                      <Select
                                        className="flex-1"
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
                                      </Select>
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
                  <div className="space-y-2">
                  <Label>Product images</Label>
                  <p className="text-sm text-zinc-500">
                    Select up to 10 images. They will upload when you create the product.
                  </p>
                  <div>
                    <input
                      id="product-images"
                      type="file"
                      multiple
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => handleSelectImages(e.target.files)}
                    />
                    <label
                      htmlFor="product-images"
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                    >
                      <Plus className="h-4 w-4 text-zinc-400" />
                      {selectedFiles.length > 0
                        ? `Replace ${selectedFiles.length} selected image${selectedFiles.length === 1 ? "" : "s"}`
                        : "Select images"}
                    </label>
                  </div>
                </div>

                {uploading && (
                  <p className="text-sm text-zinc-500 text-center">Uploading...</p>
                )}

                {previewUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {previewUrls.map((url, index) => (
                      <div
                        key={url}
                        className="group relative h-24 w-full overflow-hidden rounded-md border border-zinc-200"
                      >
                        <Image
                          src={url}
                          alt={`Selected product preview ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(index)}
                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm transition hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
