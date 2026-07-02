"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerProductNewPage() {
  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/products">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Create product</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Product creation wizard will be enabled in the next pilot release.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller/products">Back to products</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 1: Basic information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
                </div>
                <p className="mt-4 text-sm text-zinc-500">
                  Wizard UI + AI review pipeline will be implemented later.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Media + validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-32 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
                </div>
                <p className="mt-4 text-sm text-zinc-500">
                  Image quality validation and scam/duplicate detection will be added.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
