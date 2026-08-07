"use client";

import { useMemo, useState } from "react";
import { Save, Sparkles } from "lucide-react";
import { SubscriptionPlan } from "@prisma/client";

import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageShell } from "@/components/layout/page-shell";
import { adminRoutes } from "@/lib/admin/navigation";
import { trpc } from "@/lib/trpc/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OfferingForm = {
  id?: string;
  tier: SubscriptionPlan;
  name: string;
  priceGhs: number;
  isActive: boolean;

  maxProducts: number | null;
  aiTier: string;
  analytics: boolean;
  promotions: boolean;
  multiStore: boolean;
};

const PLAN_ORDER = [
  SubscriptionPlan.FREE,
  SubscriptionPlan.STARTER,
  SubscriptionPlan.BUSINESS,
  SubscriptionPlan.ENTERPRISE,
] as const;

function feature(value: boolean) {
  return value ? "Included" : "Not included";
}

export default function AdminSubscriptionPage() {
  const utils = trpc.useUtils();

  const { data, isLoading } =
    trpc.admin.subscriptionOfferings.useQuery();

  const update =
    trpc.admin.upsertSubscriptionOffering.useMutation({
      onSuccess() {
        utils.admin.subscriptionOfferings.invalidate();
      },
    });

  const loadedPlans = useMemo(() => {
    const next: Record<string, OfferingForm> = {};
    for (const item of data?.offerings ?? []) {
      next[item.tier] = {
        id: item.id,
        tier: item.tier,
        name: item.name,
        priceGhs: Number(item.priceGhs),
        isActive: item.isActive,

        maxProducts: item.maxProducts,
        aiTier: item.aiTier,
        analytics: item.analytics,
        promotions: item.promotions,
        multiStore: item.multiStore,
      };
    }

    return next;
  }, [data]);
  const [draftPlans, setDraftPlans] = useState<Record<string, OfferingForm> | null>(null);
  const plans = draftPlans ?? loadedPlans;

  function change(
    tier: SubscriptionPlan,
    field: keyof OfferingForm,
    value: string | number | boolean | null
  ) {
    setDraftPlans((current) => {
      const base = current ?? loadedPlans;
      return {
      ...base,
      [tier]: {
        ...base[tier],
        [field]: value,
      },
      };
    });
  }

  function save(tier: SubscriptionPlan) {
    const plan = plans[tier];
    if (!plan) return;

    update.mutate({
      id: plan.id,
      tier: plan.tier,
      name: plan.name,
      version: "default",

      priceGhs: Number(plan.priceGhs),

      maxProducts: plan.maxProducts,
      aiTier: plan.aiTier,
      analytics: plan.analytics,
      promotions: plan.promotions,
      multiStore: plan.multiStore,

      teamManagement: false,
      apiAccess: false,
      freeTrialDays: 0,
      aiDailyRequests: 0,
      aiMaxTokensPerRequest: 0,

      isActive: plan.isActive,
    });
  }

  return (
    <PageShell>
      <AdminPageShell activeHref={adminRoutes.subscriptions}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">

        <div className="mb-8 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold">
              Subscription Pricing
            </h1>

            <p className="text-sm text-zinc-500">
              Manage seller subscription prices.
            </p>
          </div>

          <Badge variant="secondary">
            <Sparkles className="mr-1 h-4 w-4" />
            Admin Pricing
          </Badge>

        </div>

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-6">

            {PLAN_ORDER.map((tier) => {

              const plan = plans[tier];

              if (!plan) return null;

              return (
                <Card key={tier}>

                  <CardHeader className="flex flex-row items-center justify-between">

                    <CardTitle>
                      {plan.name}
                    </CardTitle>

                    <Button
                      size="sm"
                      onClick={() => save(tier)}
                      disabled={update.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>

                  </CardHeader>

                  <CardContent className="space-y-6">

                    <div className="grid gap-5 md:grid-cols-3">

                      <div>

                        <Label>Plan Name</Label>

                        <Input
                          value={plan.name}
                          onChange={(e) =>
                            change(
                              tier,
                              "name",
                              e.target.value
                            )
                          }
                        />

                      </div>

                      <div>

                        <Label>Monthly Price (GH₵)</Label>

                        <Input
                          disabled={
                            tier === SubscriptionPlan.FREE
                          }
                          type="number"
                          min={0}
                          value={plan.priceGhs}
                          onChange={(e) =>
                            change(
                              tier,
                              "priceGhs",
                              Number(e.target.value)
                            )
                          }
                        />

                      </div>

                      <div className="flex items-end gap-3">

                        <input
                          type="checkbox"
                          checked={plan.isActive}
                          onChange={(e) =>
                            change(
                              tier,
                              "isActive",
                              e.target.checked
                            )
                          }
                        />

                        <span>Plan Active</span>

                      </div>

                    </div>

                    <div className="rounded-lg border bg-zinc-50 p-4">

                      <h3 className="mb-3 font-medium">
                        Included Features
                      </h3>

                      <ul className="space-y-2 text-sm text-zinc-600">

                        <li>
                          Max products:{" "}
                          {plan.maxProducts == null
                            ? "Unlimited"
                            : plan.maxProducts}
                        </li>

                        <li>
                          AI Tier: {plan.aiTier}
                        </li>

                        <li>
                          Analytics:{" "}
                          {feature(plan.analytics)}
                        </li>

                        <li>
                          Promotions:{" "}
                          {feature(plan.promotions)}
                        </li>

                        <li>
                          Multi-store:{" "}
                          {feature(plan.multiStore)}
                        </li>

                      </ul>

                    </div>

                  </CardContent>

                </Card>
              );
            })}

          </div>
        )}
      </main>
      </AdminPageShell>
    </PageShell>
  );
}
