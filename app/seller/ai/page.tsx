"use client";

import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { canUseAiFeatures } from "@/lib/config/subscriptions";

export default function SellerAiPage() {
  const { data: me } = trpc.auth.me.useQuery();
  const plan = me?.subscription?.plan ?? "FREE";
  const status = me?.subscription?.status ?? "EXPIRED";
  const aiEnabled = canUseAiFeatures(plan as any) && status === "ACTIVE";

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/ai">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">AI Assistant</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Use AI-powered listing help and pricing suggestions based on your plan.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller/subscription">Manage plan</Link>
            </Button>
          </div>

          <Card className="mt-6 border-emerald-100 bg-emerald-50/70">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="rounded-full bg-emerald-600/10 p-2 text-emerald-700">
                {aiEnabled ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold text-emerald-900">
                  {aiEnabled ? "AI tools are available on your current plan" : "AI tools require a paid seller plan"}
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  {aiEnabled
                    ? "You can use smart search, pricing suggestions, and listing generation while your quota lasts."
                    : "Upgrade to Starter or above to unlock AI-powered seller features."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Smart listing generation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600">
                  Generate polished product descriptions, tags, and titles with AI assistance.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600">
                  Compare category trends and receive price guidance tailored to your plan.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
