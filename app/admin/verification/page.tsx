"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldX, ArrowLeft } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminVerificationCenterPage() {
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const { data, isLoading } = trpc.admin.sellerQueue.useQuery({
    status: "PENDING",
    limit: 50,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <ArrowLeft className="h-4 w-4" />
              <Link href="/admin" className="hover:text-emerald-600">
                Admin
              </Link>
              <span aria-hidden="true">/</span>
              <span>Verification Center</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-zinc-900">
              Verification Center
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Review seller verification requests and manage decisions.
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
              Pending Verifications
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
                No pending verifications at the moment.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <VerificationRow
                    key={item.id}
                    id={item.id}
                    userDisplay={item.user.profile?.displayName ?? item.user.email}
                    location={`${item.shopCity}, ${item.shopRegion}`}
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

function VerificationRow({
  id,
  userDisplay,
  location,
  reason,
  setReason,
}: {
  id: string;
  userDisplay: string;
  location: string;
  reason: string;
  setReason: (value: string) => void;
}) {
  const utils = trpc.useUtils();

  const approve = trpc.admin.approveSeller.useMutation({
    onSuccess: () => {
      utils.admin.sellerQueue.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });

  const reject = trpc.admin.rejectSeller.useMutation({
    onSuccess: () => {
      utils.admin.sellerQueue.invalidate();
      utils.admin.dashboard.invalidate();
    },
  });

  const canReject = reason.trim().length >= 10;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-zinc-900 truncate">{userDisplay}</p>
        <p className="mt-1 text-sm text-zinc-500">{location}</p>
      </div>

      <div className="flex flex-col gap-2 sm:items-end sm:flex-row sm:justify-end">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => approve.mutate({ verificationId: id })}
          disabled={approve.isPending || reject.isPending}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Approve
        </Button>
      </div>

      <div className="w-full sm:w-auto">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reject reason (min 10 characters)"
          disabled={approve.isPending || reject.isPending}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">
            {reason.trim().length === 0
              ? "Required"
              : canReject
                ? "Ready to reject"
                : `Need ${10 - reason.trim().length} more characters`}
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => reject.mutate({ verificationId: id, reason })}
            disabled={!canReject || approve.isPending || reject.isPending}
          >
            <ShieldX className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
        {reject.error && (
          <p className="mt-2 text-sm text-red-600">
            {reject.error.message ?? "Failed to reject"}
          </p>
        )}
      </div>
    </div>
  );
}
