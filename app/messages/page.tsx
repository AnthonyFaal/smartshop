"use client";

import { PageShell } from "@/components/layout/page-shell";
import { ConversationInbox } from "@/components/messaging/conversation-inbox";

export default function MessagesPage() {
  return (
    <PageShell showVerificationBanner>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"><h1 className="text-2xl font-bold text-zinc-900">Messages</h1><p className="mt-1 mb-6 text-sm text-zinc-500">Ask questions and keep purchase details in one safe place.</p><ConversationInbox /></main>
    </PageShell>
  );
}
