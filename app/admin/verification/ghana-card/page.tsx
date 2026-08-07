"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldX } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import { adminRoutes } from "@/lib/admin/navigation";

type ReasonState = Record<string, string>;

type SellerQueueItemUser = {
  email?: string | null;
  profile?: {
    displayName?: string | null;
  } | null;
};

type SellerQueueItem = {
  id: string;
  ghanaCardFrontUrl?: string | null;
  user?: SellerQueueItemUser | null;
};

export default function AdminGhanaCardReviewPage() {
  const [reasonById, setReasonById] = useState<ReasonState>({});

  // With current schema we only have one status field.
  // We still reuse the sellerQueue pattern but focus on PENDING items.
  const { data, isLoading } = trpc.admin.sellerQueue.useQuery({
    limit: 50,
  });

  const items = (data?.items ?? []) as SellerQueueItem[];

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <ArrowLeft className="h-4 w-4" />
              <Link href={adminRoutes.verificationCenter} className="hover:text-emerald-600">
                Verification Center
              </Link>
              <span aria-hidden="true">/</span>
              <span>Ghana Card Review</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-zinc-900">Ghana Card Review</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review Ghana Card submissions that are waiting for approval or follow-up.
            </p>
          </div>

          <Badge variant="secondary">
            {isLoading ? "Loading..." : `${items.length} pending`}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Ghana Card verifications
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-4"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No Ghana Card verifications are waiting for review right now.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <GhanaCardRow
                    key={item.id}
                    verificationId={item.id}
                    userDisplay={item.user?.profile?.displayName ?? item.user?.email ?? "Seller applicant"}
                    frontUrl={item.ghanaCardFrontUrl ?? "—"}
                    backUrl={null}
                    reason={reasonById[item.id] ?? ""}
                    setReason={(v) =>
                      setReasonById((prev) => ({ ...prev, [item.id]: v }))
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function GhanaCardRow({
  verificationId,
  userDisplay,
  frontUrl,
  backUrl,
  reason,
  setReason,
}: {
  verificationId: string;
  userDisplay: string;
  frontUrl: string;
  backUrl: string | null;
  reason: string;
  setReason: (value: string) => void;
}) {
  const utils = trpc.useUtils();

  const approve = trpc.admin.approveGhanaCard.useMutation({
    onSuccess: async () => {
      await utils.admin.sellerQueue.invalidate();
      await utils.admin.dashboard.invalidate();
    },
  });

  const reject = trpc.admin.rejectGhanaCard.useMutation({
    onSuccess: async () => {
      await utils.admin.sellerQueue.invalidate();
      await utils.admin.dashboard.invalidate();
    },
  });

  const requestResubmission = trpc.admin.requestGhanaCardResubmission.useMutation({
    onSuccess: async () => {
      await utils.admin.sellerQueue.invalidate();
      await utils.admin.dashboard.invalidate();
    },
  });

  const canReject = useMemo(() => reason.trim().length >= 10, [reason]);

  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 truncate">{userDisplay}</p>         
          <div className="mt-2 space-y-1">
            <p className="text-xs text-zinc-500">Front URL</p>
            <p className="break-all text-xs text-zinc-700">{frontUrl}</p>
            {backUrl ? (
              <>
                <p className="text-xs text-zinc-500">Back URL</p>
                <p className="break-all text-xs text-zinc-700">{backUrl}</p>
              </>
            ) : null}
          </div>
        </div>

        <div className="w-full sm:w-[360px]">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 flex-1"
              onClick={() => approve.mutate({ verificationId })}
              disabled={approve.isPending || reject.isPending}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() =>
                reject.mutate({ verificationId, reason: reason.trim() })
              }
              disabled={!canReject || approve.isPending || reject.isPending}
            >
              <ShieldX className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>

          <div className="mt-3">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rejection/resubmission reason (min 10 chars)"
              disabled={approve.isPending || reject.isPending}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500">
              {reason.trim().length === 0
                ? "Required"
                : canReject
                  ? "Ready"
                  : `Need ${10 - reason.trim().length} more characters`}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                requestResubmission.mutate({
                  verificationId,
                  reason: reason.trim(),
                })
              }
              disabled={!canReject || approve.isPending || reject.isPending}
            >
              Request resubmission
            </Button>
          </div>

          {reject.error || requestResubmission.error ? (
            <p className="mt-2 text-sm text-red-600">
              {(reject.error as { message?: string }).message ??
                (requestResubmission.error as {
                  message?: string;
                }).message ??
                "Action failed"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

