"use client";

import * as Select from "@radix-ui/react-select";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VerificationBanner } from "@/components/auth/verification-banner";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils/cn";

type SortBy = "createdAt" | "price" | "rating" | "soldCount";
type SortOrder = "asc" | "desc";

type AiSearchResult = {
  keywords?: string[] | string;
  category?: string | null;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  sortBy?: SortBy | string | null;
  sortOrder?: SortOrder | string | null;
};

function parseAiSearchResult(raw: string): AiSearchResult {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned) as AiSearchResult;
}

function toOptionalNumber(value: AiSearchResult["minPrice"]) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function MarketplacePage() {
  const { user } = useAuthUser();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [useAiSearch, setUseAiSearch] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [minPriceText, setMinPriceText] = useState<string>("");
  const [maxPriceText, setMaxPriceText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder | undefined>(undefined);

  const [priceFilters, setPriceFilters] = useState<{
    minPrice?: number;
    maxPrice?: number;
  }>({});

  const { data: categories, isLoading: categoriesLoading } =
    trpc.product.categories.useQuery();

  const aiSearch = trpc.ai.smartSearch.useMutation();

  const selectedCategoryName = useMemo(
    () => categories?.find((category) => category.id === categoryId)?.name,
    [categories, categoryId]
  );

  const activeFilterCount = [
    categoryId,
    priceFilters.minPrice,
    priceFilters.maxPrice,
    sortBy,
  ].filter((value) => value !== undefined && value !== "").length;

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
    setSortBy(undefined);
    setSortOrder(undefined);
    setQuery(search.trim() ? search.trim() : undefined);
  };

  const applyAiResult = (raw: string) => {
    const parsed = parseAiSearchResult(raw);
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter(Boolean).join(" ")
      : parsed.keywords;
    const nextQuery = keywords?.trim() || search.trim();

    const matchedCategory = parsed.category
      ? categories?.find((category) =>
          category.name.toLowerCase().includes(String(parsed.category).toLowerCase())
        )
      : undefined;

    const nextMinPrice = toOptionalNumber(parsed.minPrice);
    const nextMaxPrice = toOptionalNumber(parsed.maxPrice);
    const nextSortBy = ["createdAt", "price", "rating", "soldCount"].includes(
      String(parsed.sortBy)
    )
      ? (parsed.sortBy as SortBy)
      : undefined;
    const nextSortOrder = parsed.sortOrder === "asc" || parsed.sortOrder === "desc"
      ? parsed.sortOrder
      : nextSortBy === "price"
      ? "asc"
      : nextSortBy
      ? "desc"
      : undefined;

    setQuery(nextQuery || undefined);
    setCategoryId(matchedCategory?.id);
    setMinPriceText(nextMinPrice?.toString() ?? "");
    setMaxPriceText(nextMaxPrice?.toString() ?? "");
    setPriceFilters({ minPrice: nextMinPrice, maxPrice: nextMaxPrice });
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setFiltersOpen(Boolean(matchedCategory || nextMinPrice || nextMaxPrice || nextSortBy));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = search.trim();

    if (!trimmed) {
      setQuery(undefined);
      return;
    }

    if (!useAiSearch) {
      setQuery(trimmed);
      return;
    }

    if (!user) {
      toast.error("Sign in to use AI search. Showing normal search results.");
      setQuery(trimmed);
      return;
    }

    try {
      const result = await aiSearch.mutateAsync({ query: trimmed });
      applyAiResult(result.result);
      toast.success("AI search refined your results");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI search failed";
      toast.error(`${message}. Showing normal search results.`);
      setQuery(trimmed);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <VerificationBanner />
      <main className="flex-1">
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Marketplace</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Discover products from verified sellers at UMaT
                </p>
              </div>

              <form
                onSubmit={handleSearch}
                className="flex w-full flex-col gap-2 lg:max-w-2xl"
                role="search"
              >
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    placeholder={useAiSearch ? "Try: phones under GHS 800 with best ratings" : "Search products..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 bg-white pl-10 pr-28 shadow-sm"
                    aria-label="Search products"
                  />
                  <button
                    type="button"
                    onClick={() => setUseAiSearch((enabled) => !enabled)}
                    className={cn(
                      "absolute right-14 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
                      useAiSearch
                        ? "bg-emerald-100 text-emerald-800"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                    )}
                    aria-pressed={useAiSearch}
                    aria-label={useAiSearch ? "Disable AI search" : "Enable AI search"}
                    title={useAiSearch ? "AI search on" : "AI search off"}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI
                  </button>
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-1.5 top-1/2 h-8 w-10 -translate-y-1/2 rounded-md"
                    disabled={aiSearch.isPending}
                    aria-label="Search"
                  >
                    {aiSearch.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  className="inline-flex h-9 items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                  aria-expanded={filtersOpen}
                >
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        {activeFilterCount}
                      </span>
                    )}
                  </span>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>

            {filtersOpen && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                  <div className="lg:col-span-4">
                    <Label className="text-xs font-medium uppercase tracking-normal text-zinc-500">
                      Category
                    </Label>
                    <Select.Root
                      value={categoryId ?? "all"}
                      onValueChange={(value) =>
                        setCategoryId(value === "all" ? undefined : value)
                      }
                      disabled={categoriesLoading}
                    >
                      <Select.Trigger className="mt-1 inline-flex h-10 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60">
                        <Select.Value>
                          {selectedCategoryName ?? "All categories"}
                        </Select.Value>
                        <Select.Icon>
                          <ChevronDown className="h-4 w-4 text-zinc-500" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          position="popper"
                          side="bottom"
                          align="start"
                          sideOffset={6}
                          avoidCollisions={false}
                          className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
                        >
                          <Select.Viewport className="p-1">
                            <Select.Item
                              value="all"
                              className="relative flex cursor-pointer select-none items-center rounded-md px-8 py-2 text-sm text-zinc-700 outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-800"
                            >
                              <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                                <Check className="h-4 w-4" />
                              </Select.ItemIndicator>
                              <Select.ItemText>All categories</Select.ItemText>
                            </Select.Item>
                            {categories?.map((category) => (
                              <Select.Item
                                key={category.id}
                                value={category.id}
                                className="relative flex cursor-pointer select-none items-center rounded-md px-8 py-2 text-sm text-zinc-700 outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-800"
                              >
                                <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                                  <Check className="h-4 w-4" />
                                </Select.ItemIndicator>
                                <Select.ItemText>{category.name}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  <div className="lg:col-span-2">
                    <Label htmlFor="minPrice" className="text-xs font-medium uppercase tracking-normal text-zinc-500">
                      Min price
                    </Label>
                    <Input
                      id="minPrice"
                      inputMode="numeric"
                      type="number"
                      min={0}
                      placeholder="GHS 50"
                      value={minPriceText}
                      onChange={(e) => setMinPriceText(e.target.value)}
                      className="mt-1 h-10 bg-white"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <Label htmlFor="maxPrice" className="text-xs font-medium uppercase tracking-normal text-zinc-500">
                      Max price
                    </Label>
                    <Input
                      id="maxPrice"
                      inputMode="numeric"
                      type="number"
                      min={0}
                      placeholder="GHS 500"
                      value={maxPriceText}
                      onChange={(e) => setMaxPriceText(e.target.value)}
                      className="mt-1 h-10 bg-white"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <Label className="text-xs font-medium uppercase tracking-normal text-zinc-500">
                      Sort
                    </Label>
                    <Select.Root
                      value={sortBy ? `${sortBy}:${sortOrder ?? "desc"}` : "newest"}
                      onValueChange={(value) => {
                        if (value === "newest") {
                          setSortBy(undefined);
                          setSortOrder(undefined);
                          return;
                        }
                        const [nextSortBy, nextSortOrder] = value.split(":") as [
                          SortBy,
                          SortOrder,
                        ];
                        setSortBy(nextSortBy);
                        setSortOrder(nextSortOrder);
                      }}
                    >
                      <Select.Trigger className="mt-1 inline-flex h-10 w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                        <Select.Value />
                        <Select.Icon>
                          <ChevronDown className="h-4 w-4 text-zinc-500" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          position="popper"
                          side="bottom"
                          align="start"
                          sideOffset={6}
                          avoidCollisions={false}
                          className="z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
                        >
                          <Select.Viewport className="p-1">
                            {[
                              ["newest", "Newest"],
                              ["price:asc", "Price: low to high"],
                              ["price:desc", "Price: high to low"],
                              ["rating:desc", "Top rated"],
                              ["soldCount:desc", "Best selling"],
                            ].map(([value, label]) => (
                              <Select.Item
                                key={value}
                                value={value}
                                className="relative flex cursor-pointer select-none items-center rounded-md px-8 py-2 text-sm text-zinc-700 outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-800"
                              >
                                <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                                  <Check className="h-4 w-4" />
                                </Select.ItemIndicator>
                                <Select.ItemText>{label}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
                    <Button type="button" onClick={applyFilters} className="h-10 flex-1">
                      Apply
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearFilters}
                      className="h-10 flex-1 bg-white lg:flex-none"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <ProductGrid
            search={query}
            categoryId={categoryId}
            minPrice={priceFilters.minPrice}
            maxPrice={priceFilters.maxPrice}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
