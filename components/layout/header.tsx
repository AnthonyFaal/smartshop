"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart, MessageCircle, User, Store } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useAuthUser } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";


export function Header() {
  const { user: contextUser, updateAuthUser } = useAuthUser();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    enabled: true,
  });

  // Keep header UI in sync on login/logout.
  // IMPORTANT: never call setState during render; do it in an effect.
  // We’ll derive the UI from query result first, and also push it into context.
  const resolvedUser = user ?? contextUser ?? null;
  const resolvedIsLoading = isLoading && resolvedUser === null;

  // Keep the context in sync after query changes.
  useEffect(() => {
    if (!isLoading && user !== contextUser) {
      updateAuthUser(user ?? null);
    }
  }, [isLoading, user, contextUser, updateAuthUser]);


  const router = useRouter();


  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg  overflow-hidden">
          <Image
            src="/icon.png" // place file in /public/logo.png
            alt="SmartShop logo"
            width={25}
            height={25}
            className="object-contain"
            priority
          />
        </div>

        <span className="text-xl font-bold text-zinc-900">
          SmartShop
        </span>
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
          {resolvedIsLoading ? (
            <>
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-24" />
            </>
          ) : resolvedUser ? (
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
                <Link href="/settings" aria-label="Account settings">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => router.push("/login")}>Sign in</Button>
              <Button onClick={() => router.push("/register")}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
