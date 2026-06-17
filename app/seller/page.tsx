"use client";

import Link from "next/link";
import { Package, TrendingUp, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-zinc-900">Seller Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your store and listings</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">Product management is coming in the next pilot release.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">Sales insights and trust score trends will appear here.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
