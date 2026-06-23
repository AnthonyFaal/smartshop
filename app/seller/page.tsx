"use client";

import Link from "next/link";
import { Package, TrendingUp, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { trpc } from "@/lib/trpc/client";
import { useInitialAuthUser } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerDashboardPage() {
  const initialUser = useInitialAuthUser();
  const { data: user } = trpc.auth.me.useQuery(undefined, {
    initialData: initialUser ?? undefined,
    staleTime: 60_000,
  });

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="text-zinc-600">Sign in to access your seller dashboard.</p>
          <Button className="mt-4" asChild>
            <Link href="/login?redirect=/seller">Sign in</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  if (user.role !== "SELLER" && user.role !== "ADMIN") {
    return (
      <PageShell showVerificationBanner>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Become a seller</CardTitle>
              <CardDescription>
                Complete seller verification to list products on SmartShop.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user.phoneVerified && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Verify your phone in Settings before applying as a seller.
                </div>
              )}
              <Button asChild disabled={!user.phoneVerified}>
                <Link href="/seller/verify">Start seller verification</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                Seller Dashboard
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Manage your store and listings
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href="/seller/products/new">Add Product</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/seller/subscription">Upgrade Plan</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Total Revenue", icon: Package },
              { title: "Pending Escrow", icon: Package },
              { title: "Available Balance", icon: Package },
              { title: "Orders Today", icon: Package },
              { title: "Products Live", icon: Package },
              { title: "Conversion Rate", icon: TrendingUp },
              { title: "Trust Score", icon: TrendingUp },
              { title: "Subscription Status", icon: TrendingUp },
              { title: "Verification Status", icon: TrendingUp },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <item.icon className="h-5 w-5 text-zinc-600" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-6 w-24 animate-pulse rounded bg-zinc-100" />
                    <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
