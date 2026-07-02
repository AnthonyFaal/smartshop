"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";


type Limits = {
  maxProducts: number;
  aiTier: string;
  analytics: boolean;
  promotions: boolean;
  multiStore: boolean;
  teamManagement: boolean;
  apiAccess: boolean;
  priceGhs: number;
};

const PLAN_TITLES: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

function formatStatus(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "TRIALING":
      return "Trialing";
    case "PAST_DUE":
      return "Past due";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status ?? "Unknown";
  }
}

function formatLimitValue(value: number, label: string) {
  if (label === "maxProducts") {
    if (!Number.isFinite(value)) return "Unlimited";
    return String(value);
  }
  if (!Number.isFinite(value)) return "Unlimited";
  return String(value);
}

export default function SellerSubscriptionPage() {
  const { data: me, isLoading } = trpc.auth.me.useQuery();

  const plan = me?.subscription?.plan ?? "FREE";
  const status = me?.subscription?.status ?? "EXPIRED";

  // After migration + TRPC offering endpoints are added, this page should query
  // active SubscriptionOffering (versioned) by seller.subscription.plan tier.
  // For now we keep the UI functional.
  const limits: Limits = {
    maxProducts: 0,
    aiTier: "basic",
    analytics: false,
    promotions: false,
    multiStore: false,
    teamManagement: false,
    apiAccess: false,
    priceGhs: 0,
  };




  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/subscription">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Subscription</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Admins manage subscription upgrades and cancellations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {isLoading ? "Loading…" : PLAN_TITLES[plan] ?? plan}
              </Badge>
              <Badge variant="outline">{formatStatus(status)}</Badge>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your plan limits</CardTitle>
                <CardDescription>
                  Limits apply to your seller account. Updated by admin actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
                    <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-100" />
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Max products</span>
                      <span className="font-medium">
                        {formatLimitValue(limits.maxProducts as number, "maxProducts")}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">AI tier</span>
                      <span className="font-medium">{limits.aiTier}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Analytics</span>
                      <span className="font-medium">
                        {limits.analytics ? "Included" : "Not included"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Promotions</span>
                      <span className="font-medium">
                        {limits.promotions ? "Included" : "Not included"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Multi-store</span>
                      <span className="font-medium">
                        {limits.multiStore ? "Included" : "Not included"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">Team management</span>
                      <span className="font-medium">
                        {limits.teamManagement ? "Included" : "Not included"}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-zinc-600">API access</span>
                      <span className="font-medium">
                        {limits.apiAccess ? "Included" : "Not included"}
                      </span>
                    </li>
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Administration</CardTitle>
                <CardDescription>
                  To change your subscription, contact the admin team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
                    <p className="font-medium">No self-serve checkout yet</p>
                    <p className="mt-1">
                      This app currently lets admins perform CRUD operations on subscriptions.
                      Sellers can view the active plan and its limits.
                    </p>
                  </div>

                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/seller">Back to dashboard</Link>
                  </Button>

                  <div className="text-xs text-zinc-500">
                    Plan price (preview): {formatCurrency(Number(limits.priceGhs))} GHS/month
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}

