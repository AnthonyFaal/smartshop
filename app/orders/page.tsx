"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";

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
