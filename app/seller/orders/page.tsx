"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";

const STATUS_OPTIONS = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"] as const;

export default function SellerOrdersPage() {
  const { data, isLoading, refetch } = trpc.order.listSeller.useQuery({ limit: 20 });
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: async () => {
      await refetch();
    },
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/orders">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Track orders and update fulfillment status as work progresses.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller/products/new">Create product</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order list</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                    <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                    <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  </div>
                ) : data?.orders?.length ? (
                  <div className="space-y-4">
                    {data.orders.map((order) => (
                      <div key={order.id} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-zinc-900">{order.orderNumber}</p>
                          <p className="mt-1 text-sm text-zinc-500">{order.store?.name ?? "Store"} • {order.items.length} item(s)</p>
                          <p className="mt-1 text-sm text-zinc-500">Placed {formatDate(order.createdAt)}</p>
                        </div>
                        <div className="flex flex-col gap-3 md:items-end">
                          <div className="text-right">
                            <p className="font-semibold text-zinc-900">{formatCurrency(Number(order.total))}</p>
                            <p className="text-sm text-zinc-500">{order.status}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              className="rounded-md border border-zinc-300 px-2 py-2 text-sm"
                              defaultValue={order.status}
                              onChange={(event) => {
                                setUpdatingId(order.id);
                                updateStatus.mutate({ orderId: order.id, status: event.target.value as any }, {
                                  onSettled: () => setUpdatingId(null),
                                });
                              }}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                    No orders yet. Once buyers place orders, they’ll appear here.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
