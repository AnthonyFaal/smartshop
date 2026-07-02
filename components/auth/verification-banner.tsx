"use client";

import Link from "next/link";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useInitialAuthUser } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

export function VerificationBanner() {
  const initialUser = useInitialAuthUser();
  const { data: user } = trpc.auth.me.useQuery(undefined, {
    enabled: initialUser === undefined,
  });

  const resolvedUser = initialUser ?? user;

  const [dismissed, setDismissed] = useState(false);

  if (!resolvedUser || resolvedUser.phoneVerified || dismissed) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm text-amber-900">
            <span className="font-medium">Verify your phone number</span> to unlock
            checkout, seller applications, and full account protection.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" asChild>
            <Link href="/settings">Verify now</Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-amber-700"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss verification reminder"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
