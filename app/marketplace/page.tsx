"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VerificationBanner } from "@/components/auth/verification-banner";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Label } from "@/components/ui/label";

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<string | undefined>(undefined);

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [minPriceText, setMinPriceText] = useState<string>("");
  const [maxPriceText, setMaxPriceText] = useState<string>("");

  const [priceFilters, setPriceFilters] = useState<{
    minPrice?: number;
    maxPrice?: number;
  }>({});

  const { data: categories, isLoading: categoriesLoading } =
    trpc.product.categories.useQuery();

  const minPrice = useMemo(() => {
    if (!minPriceText.trim()) return undefined;
    const n = Number(minPriceText);
    return Number.isFinite(n) ? n : undefined;
  }, [minPriceText]);

  const maxPrice = useMemo(() => {
    if (!maxPriceText.trim()) return undefined;
    const n = Number(maxPriceText);
    return Number.isFinite(n) ? n : undefined;
  }, [maxPriceText]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search.trim() ? search.trim() : undefined);
  };

  const applyFilters = () => {
    setPriceFilters({
      minPrice,
      maxPrice,
    });
  };

  const clearFilters = () => {
    setCategoryId(undefined);
    setMinPriceText("");
    setMaxPriceText("");
    setPriceFilters({});
    setQuery(search.trim() ? search.trim() : undefined);
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <VerificationBanner />
      <main className="flex-1">
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-bold text-zinc-900">Marketplace</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Discover products from verified sellers at UMaT
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-6 flex flex-col gap-4 md:flex-row md:items-end"
              role="search"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  aria-label="Search products"
                />
              </div>

              <Button type="submit" className="shrink-0">
                Search
              </Button>
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label htmlFor="category" className="text-sm text-zinc-700">
                  Category
                </Label>
                <div className="mt-2">
                  <select
                    id="category"
                    value={categoryId ?? ""}
                    onChange={(e) =>
                      setCategoryId(e.target.value ? e.target.value : undefined)
                    }
                    disabled={categoriesLoading}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"
                  >
                    <option value="">All categories</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="minPrice" className="text-sm text-zinc-700">
                  Min price (GHS)
                </Label>
                <div className="mt-2">
                  <Input
                    id="minPrice"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    placeholder="e.g. 50"
                    value={minPriceText}
                    onChange={(e) => setMinPriceText(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="maxPrice" className="text-sm text-zinc-700">
                  Max price (GHS)
                </Label>
                <div className="mt-2">
                  <Input
                    id="maxPrice"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    placeholder="e.g. 500"
                    value={maxPriceText}
                    onChange={(e) => setMaxPriceText(e.target.value)}
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <Button type="button" onClick={applyFilters} className="w-full">
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <ProductGrid
            search={query}
            categoryId={categoryId}
            minPrice={priceFilters.minPrice}
            maxPrice={priceFilters.maxPrice}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
