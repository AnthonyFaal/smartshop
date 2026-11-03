"use client";

import { useState } from "react";
import { CheckCircle2, MapPin, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminRoutes } from "@/lib/admin/navigation";
import { trpc } from "@/lib/trpc/client";

export default function StoreApprovalsPage() {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState<Record<string, string>>({});
  const queue = trpc.admin.storeVerificationQueue.useQuery();
  const approve = trpc.admin.approveStore.useMutation({ onSuccess: async () => { await utils.admin.storeVerificationQueue.invalidate(); toast.success("Store location approved"); }, onError: (error) => toast.error(error.message) });
  const reject = trpc.admin.rejectStore.useMutation({ onSuccess: async () => { await utils.admin.storeVerificationQueue.invalidate(); toast.success("Store review sent back to seller"); }, onError: (error) => toast.error(error.message) });

  return <PageShell><AdminPageShell activeHref={adminRoutes.storeApprovals}><main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Operating locations</p>
    <h1 className="mt-1 text-3xl font-bold text-zinc-900">Store location review</h1>
    <p className="mt-2 max-w-3xl text-sm text-zinc-600">Seller identity approval is separate. Review this queue only when a store changes where it operates or fulfils orders.</p>
    <div className="mt-7 space-y-4">{queue.isLoading ? <p className="text-sm text-zinc-500">Loading location reviews…</p> : queue.data?.length ? queue.data.map((store) => <Card key={store.id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{store.name}</CardTitle><p className="mt-1 text-sm text-zinc-500">{store.owner.profile?.displayName ?? store.owner.email} · identity: {store.owner.sellerVerification?.status ?? "NOT SUBMITTED"}</p></div><Badge variant="secondary">{store.verificationStatus.replace("_", " ")}</Badge></div></CardHeader><CardContent><p className="flex items-center gap-2 text-sm text-zinc-700"><MapPin className="h-4 w-4 text-emerald-600" />{store.address}, {store.city}, {store.region}</p><p className="mt-1 text-xs text-zinc-500">Canonical location: {store.location?.name ?? "Not set"}{store.location?.region ? `, ${store.location.region}` : ""}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={reason[store.id] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [store.id]: event.target.value }))} placeholder="Reason required only when sending back" /><Button size="sm" onClick={() => approve.mutate({ storeId: store.id })} disabled={approve.isPending}><CheckCircle2 className="h-4 w-4" />Approve</Button><Button size="sm" variant="destructive" onClick={() => reject.mutate({ storeId: store.id, reason: reason[store.id] ?? "" })} disabled={reject.isPending || (reason[store.id]?.trim().length ?? 0) < 10}><XCircle className="h-4 w-4" />Send back</Button></div></CardContent></Card>) : <Card><CardContent className="p-8 text-center text-sm text-zinc-500">No store locations need review.</CardContent></Card>}</div>
  </main></AdminPageShell></PageShell>;
}
