"use client";

import { Users, Store, Package, AlertTriangle, DollarSign, Shield, Clock3, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";
import { formatMaxProductsDisplay } from "@/lib/config/subscriptions";
import Link from "next/link";

const statCards = [
  { key: "totalUsers", label: "Total Users", icon: Users },
  { key: "totalSellers", label: "Sellers", icon: Store },
  { key: "totalProducts", label: "Active Products", icon: Package },
  { key: "openDisputes", label: "Open Disputes", icon: AlertTriangle },
] as const;

type SellerQueueItemUser = {
  email?: string | null;
  phone?: string | null;
  profile?: {
    displayName?: string | null;
  } | null;
  trustScore?: {
    score?: number | null;
  } | null;
};

type SellerQueueItem = {
  id: string;
  ghanaCardFrontUrl?: string | null;
  selfieUrl?: string | null;
  isLocationVerified?: boolean | null;
  status?: string | null;
  user?: SellerQueueItemUser | null;
};

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = trpc.admin.dashboard.useQuery();
  const { data: sellerQueue } = trpc.admin.sellerQueue.useQuery({
    limit: 5,
  });
  const { data: offeringsData } = trpc.admin.subscriptionOfferings.useQuery();

  const sellerQueueItems = (sellerQueue?.items ?? []) as SellerQueueItem[];
  const offerings = ((offeringsData?.offerings ?? []) as Array<{
    tier: string;
    name: string;
    priceGhs: unknown;
    maxProducts?: number | null;
    isActive: boolean;
    analytics: boolean;
    promotions: boolean;
    multiStore: boolean;
    teamManagement: boolean;
    apiAccess: boolean;
  }>).map((offering) => ({
    ...offering,
    priceGhs: Number(offering.priceGhs ?? 0),
    maxProducts: offering.maxProducts ?? null,
  }));

  return (
    <PageShell>
      <AdminPageShell>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-zinc-500">
                Marketplace health and operations
              </p>
            </div>
            <Badge variant="verified">
              <Shield className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(({ key, label, icon: Icon }) => (
              <Card key={key}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                    <Icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">{label}</p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {stats?.[key]?.toLocaleString() ?? 0}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Revenue
              </CardTitle>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(Number(stats?.totalRevenue ?? 0))}
                </span>
              )}
            </CardHeader>
          </Card>

          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Subscription offerings</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/subscriptions">Manage plans</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!offerings.length ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  No subscription offerings have been created yet.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {offerings.map((offering) => (
                    <div
                      key={offering.tier}
                      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-zinc-900">
                          {offering.name}
                        </p>
                        <Badge
                          variant={
                            offering.isActive ? "secondary" : "outline"
                          }
                        >
                          {offering.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-zinc-500">{offering.tier}</p>
                      <p className="mt-3 text-2xl font-semibold text-emerald-600">
                        GHS {Number(offering.priceGhs).toFixed(2)}
                      </p>
                      <p className="mt-2 text-sm text-zinc-600">
                        Max products:{" "}
                        {formatMaxProductsDisplay(offering.maxProducts ?? null)}
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                        <li>• Analytics: {offering.analytics ? "Yes" : "No"}</li>
                        <li>• Promotions: {offering.promotions ? "Yes" : "No"}</li>
                        <li>• Multi-store: {offering.multiStore ? "Yes" : "No"}</li>
                        <li>
                          • Team management:{" "}
                          {offering.teamManagement ? "Yes" : "No"}
                        </li>
                        <li>• API access: {offering.apiAccess ? "Yes" : "No"}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-emerald-600" />
                  Seller Review Queue
                </CardTitle>
                <Badge variant="secondary">
                  {sellerQueueItems.length} awaiting review
                </Badge>
              </CardHeader>
              <CardContent>
                {!sellerQueueItems.length ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                    No seller applications are awaiting review right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sellerQueueItems.map((item) => {
                      const queueLabel =
                        item.status === "UNDER_REVIEW"
                          ? "Under review"
                          : "New submission";
                      const trustScore =
                        item.user?.trustScore?.score ?? 0;

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-zinc-900">
                                {item.user?.profile?.displayName ??
                                  item.user?.email ??
                                  "Seller applicant"}
                              </p>
                              <Badge variant="secondary">{queueLabel}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-zinc-400">
                              Trust score: {trustScore}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <ApproveButton verificationId={item.id} />
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                            >
                              <Link href="/admin/verification">
                                Review
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Verification Center</CardTitle>
                <Badge variant="secondary">Review tools</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-zinc-500">
                  Open the full review workspace to inspect submitted
                  documents and make approval decisions.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Link href="/admin/verification">Open review center</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/verification/ghana-card">Ghana Card</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/verification/gps">GPS & Location</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/subscriptions">Plans</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </AdminPageShell>
    </PageShell>
  );
}

function ApproveButton({ verificationId }: { verificationId: string }) {
  const utils = trpc.useUtils();
  const approve = trpc.admin.approveSeller.useMutation({
    onSuccess: () => {
      utils.admin.sellerQueue.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });

  return (
    <Button
      size="sm"
      onClick={() => approve.mutate({ verificationId })}
      disabled={approve.isPending}
    >
      Approve
    </Button>
  );
}
