"use client";

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
import { formatMaxProductsDisplay } from "@/lib/config/subscriptions";

type PlanCardData = {
  tier: string;
  name: string;
  description: string;
  badge: string;
  accent: string;
  isPaid: boolean;
  priceGhs: number;
  maxProducts: number | null;
  aiTier: string;
  analytics: boolean;
  promotions: boolean;
  multiStore: boolean;
  teamManagement: boolean;
  apiAccess: boolean;
  isActive: boolean;
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

export default function SellerSubscriptionPage() {
  const utils = trpc.useUtils();
  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();
  const { data: plansData, isLoading: plansLoading } = trpc.auth.subscriptionPlans.useQuery();
  const checkout = trpc.auth.initializeSubscriptionCheckout.useMutation({
    onSuccess: async (result) => {
      await utils.auth.me.invalidate();
      await utils.auth.subscriptionPlans.invalidate();
      if (result.redirectUrl) window.location.assign(result.redirectUrl);
    },
  });

  const plan = me?.subscription?.plan ?? "FREE";
  const status = me?.subscription?.status ?? "EXPIRED";
  const plans = (plansData?.plans ?? []) as PlanCardData[];

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/subscription">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Seller subscriptions</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Choose the plan that fits your selling goals. Paid plans are processed through the configured checkout provider.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {meLoading ? "Loading…" : plan}
              </Badge>
              <Badge variant="outline">{formatStatus(status)}</Badge>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Current plan: {plan}</p>
            <p className="mt-1 text-emerald-700">
              Free is always available. Paid plans unlock more products, AI access, and seller tools.
            </p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-4">
            {plansLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index} className="h-full">
                    <CardHeader>
                      <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
                      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-zinc-100" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="h-8 w-20 animate-pulse rounded bg-zinc-100" />
                      <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
                      <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
                    </CardContent>
                  </Card>
                ))
              : plans.map((planItem) => {
                  const isCurrent = plan === planItem.tier;
                  const isDisabled = isCurrent || !planItem.isActive || checkout.isPending;
                  const isFree = planItem.tier === "FREE";

                  return (
                    <Card
                      key={planItem.tier}
                      className={isCurrent ? "border-emerald-500 shadow-lg ring-1 ring-emerald-200" : "h-full"}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{planItem.name}</CardTitle>
                          <Badge variant={isCurrent ? "secondary" : "outline"}>{planItem.badge}</Badge>
                        </div>
                        <CardDescription>{planItem.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-3xl font-semibold text-zinc-900">
                            {planItem.priceGhs === 0 ? "Free" : formatCurrency(planItem.priceGhs)}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {planItem.priceGhs === 0 ? "Included for every seller" : "Per month"}
                          </p>
                        </div>

                        <ul className="space-y-2 text-sm text-zinc-600">
                          <li>• Max products: {formatMaxProductsDisplay(planItem.maxProducts)}</li>
                          <li>• AI tier: {planItem.aiTier}</li>
                          <li>• Analytics: {planItem.analytics ? "Included" : "Not included"}</li>
                          <li>• Promotions: {planItem.promotions ? "Included" : "Not included"}</li>
                          <li>• Multi-store: {planItem.multiStore ? "Included" : "Not included"}</li>
                        </ul>

                        <Button
                          className="w-full"
                          variant={isCurrent ? "secondary" : "default"}
                          onClick={() => checkout.mutate({ plan: planItem.tier as never })}
                          disabled={isDisabled}
                        >
                          {checkout.isPending
                            ? "Processing…"
                            : isCurrent
                              ? "Current plan"
                              : isFree
                                ? "Default plan"
                                : "Subscribe"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">What changes with a paid plan?</CardTitle>
              <CardDescription>
                Admin-managed pricing and benefits are reflected here instantly for sellers.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                <p className="font-semibold text-zinc-900">Higher limits</p>
                <p className="mt-1">Sell more products and unlock broader seller tools.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                <p className="font-semibold text-zinc-900">Advanced AI</p>
                <p className="mt-1">Access stronger automation and assistant capabilities.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                <p className="font-semibold text-zinc-900">Premium visibility</p>
                <p className="mt-1">Unlock promotions and better seller-facing features.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}

