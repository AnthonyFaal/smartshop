"use client";

import Link from "next/link";
import { Package, TrendingUp, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default function SellerDashboardPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: dashboard, isLoading } = trpc.auth.sellerDashboard.useQuery();

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
              {
                title: "Total Revenue",
                icon: Package,
                value: formatCurrency(dashboard?.metrics.totalRevenue ?? 0),
                hint: "Completed sales",
              },
              {
                title: "Pending Escrow",
                icon: Package,
                value: formatCurrency(dashboard?.metrics.pendingEscrow ?? 0),
                hint: "Orders awaiting settlement",
              },
              {
                title: "Available Balance",
                icon: Package,
                value: formatCurrency(dashboard?.metrics.availableBalance ?? 0),
                hint: "Withdrawable funds",
              },
              {
                title: "Orders Today",
                icon: Package,
                value: dashboard?.metrics.ordersToday ?? 0,
                hint: "Orders received today",
              },
              {
                title: "Products Live",
                icon: Package,
                value: dashboard?.metrics.productsLive ?? 0,
                hint: "Active listings",
              },
              {
                title: "Conversion Rate",
                icon: TrendingUp,
                value: `${((dashboard?.metrics.conversionRate ?? 0)).toFixed(1)}%`,
                hint: "Views to sales",
              },
              {
                title: "Trust Score",
                icon: TrendingUp,
                value: dashboard?.metrics.trustScore ?? 0,
                hint: "Seller reputation",
              },
              {
                title: "Subscription Status",
                icon: TrendingUp,
                value: dashboard?.planLabel ?? "Free",
                hint: dashboard?.planStatus ?? "Expired",
              },
              {
                title: "Verification Status",
                icon: TrendingUp,
                value: dashboard?.verificationStatus ?? "PENDING",
                hint: dashboard?.store?.isVerified ? "Verified store" : "Needs review",
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <item.icon className="h-5 w-5 text-zinc-600" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-6 w-24 animate-pulse rounded bg-zinc-100" />
                      <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold text-zinc-900">{item.value}</p>
                      <p className="text-sm text-zinc-500">{item.hint}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Listings</CardTitle>
                <Button asChild size="sm" variant="outline">
                  <Link href="/seller/products">Manage products</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                    <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  </div>
                ) : dashboard?.recentProducts?.length ? (
                  <div className="space-y-3">
                    {dashboard.recentProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                        <div>
                          <p className="font-medium text-zinc-900">{product.title}</p>
                          <p className="text-sm text-zinc-500">{product.status} • {product.stock} in stock</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-zinc-900">{formatCurrency(product.price)}</p>
                          <p className="text-sm text-zinc-500">{formatDate(product.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No listings yet. Create your first product to get started.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <Button asChild size="sm" variant="outline">
                  <Link href="/seller/orders">View orders</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                    <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  </div>
                ) : dashboard?.recentOrders?.length ? (
                  <div className="space-y-3">
                    {dashboard.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                        <div>
                          <p className="font-medium text-zinc-900">{order.orderNumber}</p>
                          <p className="text-sm text-zinc-500">{order.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-zinc-900">{formatCurrency(order.total)}</p>
                          <p className="text-sm text-zinc-500">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No orders yet. Once buyers place orders, they’ll show here.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-emerald-100 bg-emerald-50/70">
            <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-emerald-900">Plan usage</p>
                <p className="text-sm text-emerald-700">
                  {dashboard?.productUsage.used ?? 0} / {dashboard?.productUsage.limitLabel ?? "Infinity"} products used
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100">
                  <Link href="/seller/subscription">Manage plan</Link>
                </Button>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/seller/products/new">Create listing</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
