"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Clock3,
  CreditCard,
  ShieldCheck,
  ShieldX,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getSellerVerificationSummary } from "@/lib/admin/verification";

type ReasonById = Record<string, string>;

type SellerQueueItemUser = {
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean | null;
  profile?: { displayName?: string | null } | null;
  trustScore?: { score?: number | null } | null;
};

type SellerQueueItem = {
  id: string;
  ghanaCardFrontUrl?: string | null;
  selfieUrl?: string | null;
  status?: string | null;
  user?: SellerQueueItemUser | null;
};

export default function AdminVerificationCenterPage() {
  const [reasonById, setReasonById] = useState<ReasonById>({});

  const { data, isLoading } = trpc.admin.sellerQueue.useQuery({
    limit: 50,
  });

  const items = (data?.items ?? []) as SellerQueueItem[];

  return (
    <div className="min-h-screen ">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb & Title */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <Link href="/admin" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Admin Dashboard
              </Link>
              <span aria-hidden="true" className="text-zinc-300">/</span>
              <span className="text-zinc-800 font-semibold">Verification Center</span>
            </nav>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              Verification Center
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review and audit identity compliance workflows for incoming seller profiles.
            </p>
          </div>

          <Badge variant={items.length > 0 ? "destructive" : "secondary"} className="self-start sm:self-center px-3 py-1 text-xs font-semibold shadow-sm">
            {isLoading ? "Syncing..." : `${items.length} Pending Review`}
          </Badge>
        </div>

        {/* Content Container */}
        <Card className="border-zinc-200/80 shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-zinc-100 py-5">
            <CardTitle className="text-lg font-md flex items-center gap-2 text-zinc-800">
              <ShieldCheck className="h-5 w-5 text-emerald-600 animate-pulse" />
              Applications Queue
            </CardTitle>
            <CardDescription>Evaluate documentation accuracy and consistency below.</CardDescription>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-zinc-100 bg-white">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-lg border p-4">
                    <div className="flex justify-between"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-20" /></div>
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 mb-3">
                  <BadgeCheck className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">Queue completely clear</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">All incoming seller authentication steps are up to date.</p>
              </div>
            ) : (
              items.map((item) => {
                const summary = getSellerVerificationSummary({
                  phoneVerified: Boolean(item.user?.phoneVerified),
                  hasGhanaCard: Boolean(item.ghanaCardFrontUrl),
                  hasSelfie: Boolean(item.selfieUrl),
                  status: item.status as any,
                });

                return (
                  <VerificationRow
                    key={item.id}
                    item={item}
                    summary={summary}
                    reason={reasonById[item.id] ?? ""}
                    setReason={(v) => setReasonById((prev) => ({ ...prev, [item.id]: v }))}
                  />
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function VerificationRow({
  item,
  summary,
  reason,
  setReason,
}: {
  item: SellerQueueItem;
  summary: any;
  reason: string;
  setReason: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const utils = trpc.useUtils();

  const approve = trpc.admin.approveSeller.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.sellerQueue.invalidate(),
        utils.admin.dashboard.invalidate()
      ]);
    },
  });

  const reject = trpc.admin.rejectSeller.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.sellerQueue.invalidate(),
        utils.admin.dashboard.invalidate()
      ]);
    },
  });

  const canReject = useMemo(() => reason.trim().length >= 10, [reason]);
  const userDisplay = item.user?.profile?.displayName ?? item.user?.email ?? "Unnamed Merchant";

  return (
    <div className={`transition-colors duration-150 ${isExpanded ? "bg-zinc-50/60" : "hover:bg-zinc-50/30"}`}>
      {/* Primary Accessible Row Summary Block */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 cursor-pointer select-none"
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-zinc-900 truncate">{userDisplay}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono tracking-tight bg-white">
                Score: {item.user?.trustScore?.score ?? 0}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{item.user?.email ?? "No email linked"}</p>
          </div>
        </div>

        {/* Mid Row Flags */}
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto shrink-0 border-t sm:border-0 pt-3 sm:pt-0 border-zinc-100">
          <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">Metrics Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700">{summary.completedCount}/3 Checklist</span>
              <div className="w-16 bg-zinc-200 h-1.5 rounded-full overflow-hidden hidden xs:block">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${summary.progress}%` }} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={summary.allComplete ? "default" : "secondary"} className="text-xs font-medium">
              {summary.statusLabel}
            </Badge>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </div>
        </div>
      </div>

      {/* Expanded Verification Details Block */}
      {isExpanded && (
        <div className="px-5 pb-6 pt-2 border-t border-zinc-100/70 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <div className="lg:col-span-2 space-y-4">
            
            {/* Split Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">  
              {/* Progress Detail */}
              <div className="rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Compliance Checklist
                </div>
                <div className="space-y-2 text-xs text-zinc-600">
                  <p><span className="font-medium text-zinc-900">Phone Verification:</span> {item.user?.phone ? <span>{item.user.phone} ({item.user.phoneVerified ? "Verified" : "Unverified"})</span> : "Missing"}</p>
                  <p><span className="font-medium text-zinc-900">Completeness:</span> {summary.progress}% reached</p>
                  <div className="pt-1.5">
                    <span className="font-medium text-zinc-900 block mb-1">Incomplete Requirements:</span>
                    <div className="flex gap-1 flex-wrap">
                      {summary.pendingSteps.length ? summary.pendingSteps.map((step: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-[10px] bg-red-50 text-red-700 hover:bg-red-50 border-red-100">{step}</Badge>
                      )) : <span className="text-emerald-600 font-medium">None. All steps passed.</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Evidence Box */}
            <div className="rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                Biometric & National Identity Proof
              </div>
              
              <div className="bg-zinc-50/50 p-3 rounded-lg mb-4 border border-zinc-100">
                <div className="text-xs text-zinc-500">Ghana Card Register Reference</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DocumentPreview title="ID Card Front" url={item.ghanaCardFrontUrl ?? null} alt="Ghana Card Face Side" />
                <DocumentPreview title="Live Selfie Check" url={item.selfieUrl ?? null} alt="User Verification Selfie" />
              </div>
            </div>
          </div>

          {/* HCI Sidebar Decision Panel */}
          <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/80 p-4 h-fit sticky top-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                <Clock3 className="h-3.5 w-3.5 text-zinc-600" />
                Review Dispatch Action
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800 mb-4 flex gap-2">
                <Camera className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>Verify that portraits match and physical locations correspond to real merchant points.</span>
              </div>

              <label htmlFor={`reason-${item.id}`} className="sr-only">Rejection Reason</label>
              <Input
                id={`reason-${item.id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Type dynamic rejection context (min 10 chars)..."
                disabled={approve.isPending || reject.isPending}
                className="bg-white text-xs h-9 border-zinc-200 shadow-inner"
              />
              
              {/* Context Feedback Line */}
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <AlertCircle className={`h-3.5 w-3.5 ${canReject ? "text-amber-500" : "text-zinc-400"}`} />
                <span className={canReject ? "text-zinc-700" : "text-zinc-400"}>
                  {reason.trim().length === 0 ? "Rejection requires dynamic reason logs." : canReject ? "Rejection message unlocked." : `${10 - reason.trim().length} chars short.`}
                </span>
              </div>
            </div>

            {/* Final Action Triggers */}
            <div className="mt-6 flex flex-col gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 font-medium shadow-sm transition-transform active:scale-95"
                onClick={() => approve.mutate({ verificationId: item.id })}
                disabled={approve.isPending || reject.isPending}
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                {approve.isPending ? "Approving..." : "Approve Merchant"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="font-medium shadow-sm transition-transform active:scale-95"
                onClick={() => reject.mutate({ verificationId: item.id, reason })}
                disabled={!canReject || approve.isPending || reject.isPending}
              >
                <ShieldX className="mr-1.5 h-4 w-4" />
                {reject.isPending ? "Rejecting..." : "Reject & Notify"}
              </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function DocumentPreview({ title, url, alt }: { title: string; url: string | null; alt: string }) {
  const isValidUrl = Boolean(url && url !== "—" && url.trim().length > 0);

  if (!isValidUrl) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 h-40 text-center text-zinc-400">
        <span className="text-[11px] font-medium uppercase tracking-wider">{title}</span>
        <span className="text-[10px] mt-1">Unavailable</span>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-3 py-1.5">
        <p className="text-[11px] font-semibold text-zinc-700">{title}</p>
        <a
          href={url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-medium transition-colors"
        >
          View Full <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
      <div className="p-2 bg-white flex items-center justify-center">
        <img src={url ?? undefined} alt={alt} className="h-32 w-full object-cover rounded bg-zinc-50 transition-transform duration-200 group-hover:scale-105" />
      </div>
    </div>
  );
}