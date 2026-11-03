"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import { useState } from "react";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  DELIVERED: "default",
  SHIPPED: "secondary",
  PROCESSING: "secondary",
  CONFIRMED: "secondary",
  PENDING: "outline",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

export default function OrdersPage() {
  const { data, isLoading } = trpc.order.listBuyer.useQuery({ limit: 20 });
  const utils = trpc.useUtils();
  const [reportingOrderId, setReportingOrderId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const openDispute = trpc.dispute.open.useMutation({
    onSuccess: async () => {
      await utils.dispute.mine.invalidate();
      setReportingOrderId(null);
      setReason("");
      toast.success("Your issue has been submitted for review.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">My Orders</h1>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !data?.orders.length ? (
          <div className="mt-12 text-center">
            <p className="text-zinc-500">No orders yet</p>
            <Link href="/marketplace" className="mt-4 inline-block text-emerald-600 hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {data.orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-zinc-500">
                        {order.store.name} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={statusVariant[order.status] ?? "outline"}>
                        {order.status}
                      </Badge>
                      <span className="font-semibold">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-zinc-600">
                    {order.items.map((item) => (
                      <span key={item.id} className="mr-4">
                        {item.title} × {item.quantity}
                      </span>
                    ))}
                  </div>
                  {["DELIVERED", "COMPLETED"].includes(order.status) ? (
                    <div className="mt-4 border-t border-zinc-100 pt-4">
                      {reportingOrderId === order.id ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-900" htmlFor={`reason-${order.id}`}>What went wrong?</label>
                          <textarea id={`reason-${order.id}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the item or delivery issue. Include only facts that can be checked." className="min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                          <div className="flex gap-2"><Button size="sm" disabled={openDispute.isPending || reason.trim().length < 10} onClick={() => openDispute.mutate({ orderId: order.id, reason })}>Submit for review</Button><Button size="sm" variant="outline" onClick={() => { setReportingOrderId(null); setReason(""); }}>Cancel</Button></div>
                        </div>
                      ) : <Button size="sm" variant="outline" onClick={() => setReportingOrderId(order.id)}>Report an issue</Button>}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
