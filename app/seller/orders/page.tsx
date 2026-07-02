"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerOrdersPage() {
  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/orders">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Orders</h1>
              <p className="mt-1 text-sm text-zinc-500">
                View order timeline and audit trail.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller/products/new">Create product</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order list</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
