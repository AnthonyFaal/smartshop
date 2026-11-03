"use client";

import { BarChart3, CheckCircle2, Clock3, Repeat2, ShieldAlert } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";
import { adminRoutes } from "@/lib/admin/navigation";

function Metric({ label, value, detail, healthy }: { label: string; value: string; detail: string; healthy?: boolean }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p><p className={`mt-1 text-xs ${healthy === false ? "text-amber-700" : "text-zinc-500"}`}>{detail}</p></CardContent></Card>;
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = trpc.admin.pilotScorecard.useQuery({ days: 30 });
  if (isLoading || !data) return <PageShell><AdminPageShell activeHref={adminRoutes.analytics}><main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><Skeleton className="h-40 w-full" /></main></AdminPageShell></PageShell>;
  const onTimeLabel = data.onTimeDeliveryRate === null ? "No delivery tasks yet" : `${data.onTimeDeliveryRate.toFixed(1)}%`;
  return <PageShell><AdminPageShell activeHref={adminRoutes.analytics}><main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-100 p-3"><BarChart3 className="h-6 w-6 text-emerald-700" /></div><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Pilot scorecard</p><h1 className="mt-1 text-3xl font-bold text-zinc-900">Are we earning repeat trust?</h1><p className="mt-2 max-w-3xl text-sm text-zinc-600">Last {data.periodDays} days. Expansion requires repeat, on-time fulfilled orders—not registrations, listings or GMV alone.</p></div></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Fulfilled orders" value={String(data.fulfilledOrders)} detail={`Target: ${data.targets.weeklyFulfilledOrders} weekly; this view is ${data.periodDays} days.`} healthy={data.fulfilledOrders >= data.targets.weeklyFulfilledOrders * (data.periodDays / 7)} />
      <Metric label="Repeat buyers" value={`${data.repeatBuyerRate.toFixed(1)}%`} detail={`Target: ${data.targets.repeatBuyerRate}% of active buyers buy twice.`} healthy={data.repeatBuyerRate >= data.targets.repeatBuyerRate} />
      <Metric label="On-time delivery" value={onTimeLabel} detail={`Target: ${data.targets.onTimeDeliveryRate}% of completed delivery tasks.`} healthy={data.onTimeDeliveryRate === null ? undefined : data.onTimeDeliveryRate >= data.targets.onTimeDeliveryRate} />
      <Metric label="Dispute rate" value={`${data.disputeRate.toFixed(1)}%`} detail={`Maximum: ${data.targets.disputeRateMaximum}% of fulfilled orders.`} healthy={data.disputeRate <= data.targets.disputeRateMaximum} />
    </div>
    <div className="mt-6 grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Contribution view</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Row label="Fulfilled GMV" value={formatCurrency(data.gmv)} /><Row label="Marketplace fee revenue" value={formatCurrency(data.platformRevenue)} /><Row label="Delivery revenue" value={formatCurrency(data.deliveryRevenue)} /><Row label="Gross marketplace revenue" value={formatCurrency(data.grossMarketplaceRevenue)} strong /><p className="border-t pt-3 text-xs text-amber-700">This is not final contribution margin yet. Runner, payment-processing, refund and support costs need an approved expense feed before profitability can be claimed.</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" />Decision discipline</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-zinc-600"><p><Repeat2 className="mr-2 inline h-4 w-4 text-emerald-600" />{data.activeBuyers} active buyer{data.activeBuyers === 1 ? "" : "s"}; judge retention only from a second fulfilled order.</p><p><Clock3 className="mr-2 inline h-4 w-4 text-emerald-600" />Cancellation rate: {data.cancellationRate.toFixed(1)}%. Investigate stock accuracy, price surprise and payment friction.</p><p>Do not expand zones until every scorecard target is met for four consecutive weeks and the finance reconciliation confirms positive contribution margin.</p></CardContent></Card></div>
  </main></AdminPageShell></PageShell>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className={`flex justify-between ${strong ? "border-t pt-3 font-semibold text-zinc-900" : "text-zinc-600"}`}><span>{label}</span><span>{value}</span></div>; }
