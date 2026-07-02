"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Clock3,
  CreditCard,
  MapPin,
  ShieldCheck,
  ShieldX,
  User,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getSellerVerificationSummary } from "@/lib/admin/verification";

type ReasonById = Record<string, string>;

export default function AdminVerificationCenterPage() {
  const [reasonById, setReasonById] = useState<ReasonById>({});

  const { data, isLoading } = trpc.admin.sellerQueue.useQuery({
    status: "PENDING",
    limit: 50,
  });

  const items = data?.items ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
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
              Review seller verification submissions in detail and approve or reject them.
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
              Pending seller applications
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-200 p-4"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No pending seller verifications at the moment.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const summary = getSellerVerificationSummary({
                    phoneVerified: Boolean(item.user.phoneVerified),
                    hasGhanaCard: Boolean(item.ghanaCardFrontUrl),
                    hasSelfie: Boolean(item.selfieUrl),
                    hasLocation: Boolean(item.isLocationVerified),
                    status: item.status,
                  });

                  return (
                    <VerificationRow
                      key={item.id}
                      id={item.id}
                      userDisplay={item.user.profile?.displayName ?? item.user.email}
                      email={item.user.email}
                      phone={item.user.phone ?? "—"}
                      trustScore={item.user.trustScore?.score ?? 0}
                      location={`${item.shop_city}, ${item.shop_region}`}
                      address={item.shop_address || "—"}
                      coordinates={`lat ${String(item.latitude)}, lng ${String(item.longitude)}`}
                      ghanaCardNumber={item.ghanaCardNumber || "—"}
                      ghanaCardFrontUrl={item.ghanaCardFrontUrl}
                      ghanaCardBackUrl={item.ghanaCardBackUrl ?? null}
                      selfieUrl={item.selfieUrl}
                      summary={summary}
                      reason={reasonById[item.id] ?? ""}
                      setReason={(v) =>
                        setReasonById((prev) => ({ ...prev, [item.id]: v }))
                      }
                    />
                  );
                })}
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
  email,
  phone,
  trustScore,
  location,
  address,
  coordinates,
  ghanaCardNumber,
  ghanaCardFrontUrl,
  ghanaCardBackUrl,
  selfieUrl,
  summary,
  reason,
  setReason,
}: {
  id: string;
  userDisplay: string;
  email: string;
  phone: string;
  trustScore: number;
  location: string;
  address: string;
  coordinates: string;
  ghanaCardNumber: string;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string | null;
  selfieUrl: string;
  summary: ReturnType<typeof getSellerVerificationSummary>;
  reason: string;
  setReason: (value: string) => void;
}) {
  const utils = trpc.useUtils();

  const approve = trpc.admin.approveSeller.useMutation({
    onSuccess: async () => {
      await utils.admin.sellerQueue.invalidate();
      await utils.admin.dashboard.invalidate();
    },
  });

  const reject = trpc.admin.rejectSeller.useMutation({
    onSuccess: async () => {
      await utils.admin.sellerQueue.invalidate();
      await utils.admin.dashboard.invalidate();
    },
  });

  const canReject = useMemo(() => reason.trim().length >= 10, [reason]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">{userDisplay}</p>
                  <p className="text-sm text-zinc-500">{email}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Trust {trustScore}</Badge>
              <Badge variant={summary.allComplete ? "default" : "outline"}>
                {summary.statusLabel}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Shop details
              </div>
              <div className="mt-3 space-y-2 text-sm text-zinc-600">
                <p><span className="font-medium text-zinc-800">Location:</span> {location}</p>
                <p><span className="font-medium text-zinc-800">Address:</span> {address}</p>
                <p><span className="font-medium text-zinc-800">Coordinates:</span> {coordinates}</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                Verification progress
              </div>
              <div className="mt-3 space-y-2 text-sm text-zinc-600">
                <p><span className="font-medium text-zinc-800">Completed:</span> {summary.completedCount}/4</p>
                <p><span className="font-medium text-zinc-800">Progress:</span> {summary.progress}%</p>
                <p><span className="font-medium text-zinc-800">Pending:</span> {summary.pendingSteps.length ? summary.pendingSteps.join(", ") : "None"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Identity documents
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white p-3 text-sm">
                <p className="font-medium text-zinc-800">Ghana Card</p>
                <p className="mt-1 text-zinc-600">Number: {ghanaCardNumber}</p>
                <p className="mt-1 break-all text-xs text-zinc-500">{ghanaCardFrontUrl}</p>
                {ghanaCardBackUrl ? (
                  <p className="mt-1 break-all text-xs text-zinc-500">Back: {ghanaCardBackUrl}</p>
                ) : null}
              </div>
              <div className="rounded-lg bg-white p-3 text-sm">
                <p className="font-medium text-zinc-800">Selfie</p>
                <p className="mt-1 break-all text-xs text-zinc-500">{selfieUrl}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Camera className="h-4 w-4 text-emerald-600" />
              Review notes
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Approve the seller only after the submitted identity and location evidence look consistent.
            </p>
          </div>
        </div>

        <div className="w-full max-w-md space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <Clock3 className="h-4 w-4 text-emerald-600" />
            Decision panel
          </div>

          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (min 10 characters)"
            disabled={approve.isPending || reject.isPending}
          />

          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => approve.mutate({ verificationId: id })}
              disabled={approve.isPending || reject.isPending}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Approve seller
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => reject.mutate({ verificationId: id, reason })}
              disabled={!canReject || approve.isPending || reject.isPending}
            >
              <ShieldX className="mr-2 h-4 w-4" />
              Reject seller
            </Button>
          </div>

          <p className="text-xs text-zinc-500">
            {reason.trim().length === 0
              ? "A rejection reason is required before rejecting."
              : canReject
                ? "Ready to reject this application."
                : `Add ${10 - reason.trim().length} more characters to reject.`}
          </p>
        </div>
      </div>
    </div>
  );
}

