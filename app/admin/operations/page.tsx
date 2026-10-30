"use client";

import { Banknote, Truck } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { adminRoutes } from "@/lib/admin/navigation";

export default function OperationsPage() {
  const utils = trpc.useUtils();
  const delivery = trpc.delivery.operationsQueue.useQuery();
  const settlements = trpc.settlement.operationsQueue.useQuery();
  const updateDelivery = trpc.delivery.updateTask.useMutation({ onSuccess: async () => { await utils.delivery.operationsQueue.invalidate(); toast.success("Delivery task updated"); }, onError: (error) => toast.error(error.message) });
  const markPaid = trpc.settlement.markPaid.useMutation({ onSuccess: async () => { await utils.settlement.operationsQueue.invalidate(); toast.success("Settlement recorded as paid"); }, onError: (error) => toast.error(error.message) });

  return <PageShell><AdminPageShell activeHref={adminRoutes.operations}><main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Operations control</p><h1 className="mt-1 text-3xl font-bold text-zinc-900">Fulfilment and seller settlements</h1><p className="mt-2 max-w-3xl text-sm text-zinc-600">This is an internal ledger and hand-off queue. Confirm payment-provider reconciliation and real delivery proof before recording either action.</p></div>
    <div className="mt-7 grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-emerald-600" />Delivery queue</CardTitle></CardHeader><CardContent className="space-y-3">{delivery.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : delivery.data?.length ? delivery.data.map((task) => <div key={task.id} className="rounded-xl border border-zinc-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-zinc-900">{task.order.orderNumber}</p><p className="text-sm text-zinc-500">{task.zone.location.name} · due {formatDate(task.promisedBy)}</p>{task.runner && <p className="mt-1 text-xs text-zinc-500">Runner: {task.runner.profile?.displayName ?? task.runner.profile?.firstName ?? task.runner.id}</p>}</div><Badge variant="secondary">{task.status.replace("_", " ")}</Badge></div><div className="mt-3 flex gap-2">{task.status === "UNASSIGNED" && <Button size="sm" onClick={() => { const runnerId = window.prompt("Enter approved runner user ID"); if (runnerId) updateDelivery.mutate({ taskId: task.id, status: "ASSIGNED", runnerId }); }}>Assign runner</Button>}{task.status === "ASSIGNED" && <Button size="sm" onClick={() => { const proofUrl = window.prompt("Enter private pickup-proof URL"); if (proofUrl) updateDelivery.mutate({ taskId: task.id, status: "PICKED_UP", proofUrl }); }}>Mark picked up</Button>}{task.status === "PICKED_UP" && <Button size="sm" onClick={() => { const proofUrl = window.prompt("Enter private delivery-proof URL"); const handoffCode = window.prompt("Enter the buyer handoff code"); if (proofUrl && handoffCode) updateDelivery.mutate({ taskId: task.id, status: "DELIVERED", proofUrl, handoffCode }); }}>Mark delivered</Button>}</div></div>) : <Empty text="No active delivery tasks." />}</CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-emerald-600" />Settlement queue</CardTitle></CardHeader><CardContent className="space-y-3">{settlements.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : settlements.data?.length ? settlements.data.map((settlement) => <div key={settlement.id} className="rounded-xl border border-zinc-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-zinc-900">{settlement.order.orderNumber} · {formatCurrency(Number(settlement.amount))}</p><p className="text-sm text-zinc-500">{settlement.seller.profile?.displayName ?? settlement.seller.email} · available {formatDate(settlement.availableAt)}</p></div><Badge variant="secondary">{settlement.status}</Badge></div>{settlement.status === "AVAILABLE" && <Button className="mt-3" size="sm" onClick={() => { const reference = window.prompt("Enter the reconciled provider transfer reference"); if (reference) markPaid.mutate({ settlementId: settlement.id, providerRef: reference }); }}>Record payout</Button>}</div>) : <Empty text="No settlements awaiting action." />}</CardContent></Card></div>
  </main></AdminPageShell></PageShell>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">{text}</div>; }
