"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerCustomersPage() {
  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/customers">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Customers</h1>
              <p className="mt-1 text-sm text-zinc-500">Review customer activity and messaging opportunities.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller">Back to dashboard</Link>
            </Button>
          </div>

          <Card className="mt-6">
            <CardHeader className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Customer overview</CardTitle>
                <p className="text-sm text-zinc-500">Buyer engagement is available from the main seller operations workspace.</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">This area will continue to grow as the seller experience expands.</p>
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
