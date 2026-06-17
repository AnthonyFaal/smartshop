"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
  return (
    <PageShell showVerificationBanner>
      <EmptyState
        title="Messages"
        description="Your conversations with buyers and sellers will appear here. This feature is rolling out during the UMaT pilot — check back soon."
        action={{ label: "Browse marketplace", href: "/marketplace" }}
      />
      <div className="pb-16 text-center">
        <MessageCircle className="mx-auto h-12 w-12 text-zinc-300" aria-hidden />
        <Button variant="link" asChild className="mt-4">
          <Link href="/help">Need help with an order?</Link>
        </Button>
      </div>
    </PageShell>
  );
}
