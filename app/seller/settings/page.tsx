"use client";

import Link from "next/link";
import { Settings as SettingsIcon } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SellerSettingsPage() {
  return (
    <PageShell showVerificationBanner>
      <SellerPageShell activeHref="/seller/settings">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
              <p className="mt-1 text-sm text-zinc-500">Manage your seller account preferences and verification profile.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/seller">Back to dashboard</Link>
            </Button>
          </div>

          <Card className="mt-6">
            <CardHeader className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Account settings</CardTitle>
                <p className="text-sm text-zinc-500">Use the main account settings area for profile updates.</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600">Notifications, security, and account preferences are managed from the shared settings experience.</p>
            </CardContent>
          </Card>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
