"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, ShieldCheck, Store } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useInitialAuthUser } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

export function LandingHeroCTA() {
  const { data: user } = trpc.auth.me.useQuery();

  if (user) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button size="lg" asChild>
          <Link href="/marketplace">
            Continue Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        {user.role === "SELLER" ? (
          <Button size="lg" variant="outline" asChild>
            <Link href="/seller">
              <Store className="mr-2 h-4 w-4" />
              Seller Dashboard
            </Link>
          </Button>
        ) : (
          <Button size="lg" variant="outline" asChild>
            <Link href="/seller/verify">
              <Store className="mr-2 h-4 w-4" />
              Become a Seller
            </Link>
          </Button>
        )}
        {!user.phoneVerified && (
          <Button size="lg" variant="ghost" asChild>
            <Link href="/settings">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verify Phone
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Button size="lg" asChild>
        <Link href="/marketplace">
          Browse Marketplace
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/register">Create Free Account</Link>
      </Button>
    </div>
  );
}

export function LandingBottomCTA() {
  const { data: user } = trpc.auth.me.useQuery();

  if (user) {
    return (
      <>
        <h2 className="text-3xl font-bold text-white">
          Welcome back, {user.profile?.firstName ?? "shopper"}!
        </h2>
        <p className="mt-4 text-lg text-emerald-100">
          Pick up where you left off — your cart and orders are waiting.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/marketplace">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Go to Marketplace
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
            <Link href="/orders">View Orders</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-3xl font-bold text-white">Ready to buy or sell?</h2>
      <p className="mt-4 text-lg text-emerald-100">
        Join UMaT students trading safely on SmartShop.
      </p>
      <Button size="lg" variant="secondary" className="mt-8" asChild>
        <Link href="/register">Create Free Account</Link>
      </Button>
    </>
  );
}
