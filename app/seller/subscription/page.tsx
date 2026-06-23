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

export default function SellerSubscriptionPage() {
  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/subscription">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-bold text-zinc-900">Subscription</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Subscription plans are managed by admins. Select a plan to unlock
            selling features.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {["FREE", "STARTER", "BUSINESS"].map((plan) => (
              <Card key={plan}>
                <CardHeader>
                  <CardTitle className="text-base">{plan}</CardTitle>
                  <CardDescription>
                    Pricing and limits will load dynamically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-8 w-24 animate-pulse rounded bg-zinc-100" />
                    <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                    <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-100" />
                  </div>

                  <Button className="mt-5 w-full" variant="outline" asChild>
                    <Link href="/seller">Choose plan</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
