"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerMessagesPage() {
  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/messages">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Messages</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Real-time customer conversations and order references.
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/seller/orders">View recent orders</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-12 w-full animate-pulse rounded bg-zinc-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-10 w-4/5 animate-pulse rounded bg-zinc-100" />
                  <div className="h-10 w-3/4 animate-pulse rounded bg-zinc-100" />
                </div>
                <div className="mt-6 h-12 animate-pulse rounded bg-zinc-100" />
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
