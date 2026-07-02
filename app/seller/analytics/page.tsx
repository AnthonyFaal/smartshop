"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerAnalyticsPage() {
  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/analytics">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
              <p className="mt-1 text-sm text-zinc-500">Track listing performance, conversion metrics, and revenue growth.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller">Back to dashboard</Link>
            </Button>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Performance insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">
                Analytics will be available here soon, with buyer behavior and traffic details for paid plans.
              </p>
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
