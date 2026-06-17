"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VerificationBanner } from "@/components/auth/verification-banner";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
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
            <form onSubmit={handleSearch} className="mt-6 flex gap-2" role="search">
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
              <Button type="submit">Search</Button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <ProductGrid search={query || undefined} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
