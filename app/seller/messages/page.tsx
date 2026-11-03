"use client";

import { PageShell } from "@/components/layout/page-shell";
import { SellerPageShell } from "@/components/layout/seller-page-shell";
import { ConversationInbox } from "@/components/messaging/conversation-inbox";

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

          </div>

          <div className="mt-6"><ConversationInbox /></div>
        </div>
      </SellerPageShell>
    </PageShell>
  );
}
