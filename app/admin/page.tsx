"use client";

import { Users, Store, Package, AlertTriangle, DollarSign, Shield } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";

const statCards = [
  { key: "totalUsers", label: "Total Users", icon: Users },
  { key: "totalSellers", label: "Sellers", icon: Store },
  { key: "totalProducts", label: "Active Products", icon: Package },
  { key: "openDisputes", label: "Open Disputes", icon: AlertTriangle },
] as const;

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = trpc.admin.dashboard.useQuery();
  const { data: sellerQueue } = trpc.admin.sellerQueue.useQuery({
    status: "PENDING",
    limit: 5,
  });

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-zinc-500">Marketplace health and operations</p>
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
            <CardTitle>Seller Approval Queue</CardTitle>
            <Badge variant="secondary">
              {sellerQueue?.items.length ?? 0} pending
            </Badge>
          </CardHeader>
          <CardContent>
            {!sellerQueue?.items.length ? (
              <p className="text-sm text-zinc-500">No pending verifications</p>
            ) : (
              <div className="space-y-4">
                {sellerQueue.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {item.user.profile?.displayName ?? item.user.email}
                      </p>
                      <p className="text-sm text-zinc-500">{item.shopCity}, {item.shopRegion}</p>
                    </div>
                    <div className="flex gap-2">
                      <ApproveButton verificationId={item.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
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
