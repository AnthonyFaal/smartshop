"use client";

import Link from "next/link";
import { ShoppingCart, Heart, MessageCircle, User, Store, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: user } = trpc.auth.me.useQuery();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Store className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-zinc-900">SmartShop</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          <Link href="/marketplace" className="text-sm font-medium text-zinc-600 hover:text-emerald-600">
            Marketplace
          </Link>
          {user?.role === "SELLER" && (
            <Link href="/seller" className="text-sm font-medium text-zinc-600 hover:text-emerald-600">
              Seller Dashboard
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="text-sm font-medium text-zinc-600 hover:text-emerald-600">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/wishlist" aria-label="Wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/messages" aria-label="Messages">
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/cart" aria-label="Cart">
                  <ShoppingCart className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/settings" aria-label="Settings">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
