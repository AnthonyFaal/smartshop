"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils/format";

export default function SellerPayoutsPage() {
  const { data: dashboard } = trpc.auth.sellerDashboard.useQuery();

  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/payouts">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Payouts</h1>
              <p className="mt-1 text-sm text-zinc-500">Review your available balance and payout readiness.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller">Back to dashboard</Link>
            </Button>
          </div>

          <Card className="mt-6">
            <CardHeader className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Available balance</CardTitle>
                <p className="text-sm text-zinc-500">Settled earnings that are ready to withdraw.</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-zinc-900">{formatCurrency(dashboard?.metrics.availableBalance ?? 0)}</p>
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
