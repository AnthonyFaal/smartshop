"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { useInitialAuthUser } from "@/components/providers/auth-provider";

export default function WishlistPage() {
  const { data: user } = trpc.auth.me.useQuery();

  if (!user) {
    return (
      <PageShell>
        <EmptyState
          title="Sign in to view your wishlist"
          description="Save products you love and come back to them anytime."
          action={{ label: "Sign in", href: "/login?redirect=/wishlist" }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell showVerificationBanner>
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Heart className="mx-auto h-12 w-12 text-zinc-300" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">Your wishlist is empty</h1>
        <p className="mt-2 text-zinc-600">
          Tap the heart on any product to save it here.
        </p>
        <Button className="mt-8" asChild>
          <Link href="/marketplace">Browse marketplace</Link>
        </Button>
      </div>
    </PageShell>
  );
}
