"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

function nameOf(person: { email: string; profile: { displayName: string | null; firstName: string; lastName: string } | null } | null) {
  return person?.profile?.displayName || [person?.profile?.firstName, person?.profile?.lastName].filter(Boolean).join(" ") || person?.email || "Conversation";
}

export function ConversationInbox({ initialConversationId }: { initialConversationId?: string }) {
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState(initialConversationId ?? "");
  const [draft, setDraft] = useState("");
  const conversations = trpc.message.conversations.useQuery(undefined, { refetchInterval: 8_000 });
  const activeConversationId = selectedId || conversations.data?.[0]?.id || "";
  const messages = trpc.message.messages.useQuery({ conversationId: activeConversationId }, { enabled: Boolean(activeConversationId), refetchInterval: 4_000 });
  const send = trpc.message.send.useMutation({
    onSuccess: async () => { setDraft(""); await Promise.all([utils.message.conversations.invalidate(), utils.message.messages.invalidate({ conversationId: activeConversationId })]); },
    onError: (error) => toast.error(error.message),
  });
  const markRead = trpc.message.markRead.useMutation();

  useEffect(() => { if (activeConversationId) void markRead.mutateAsync({ conversationId: activeConversationId }).then(() => utils.message.conversations.invalidate()); }, [activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !activeConversationId || send.isPending) return;
    send.mutate({ conversationId: activeConversationId, content: draft });
  }

  const selected = conversations.data?.find((item) => item.id === activeConversationId);
  return <div className="grid min-h-[580px] overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:grid-cols-[320px_1fr]">
    <aside className="border-b border-zinc-200 lg:border-b-0 lg:border-r">
      <div className="border-b border-zinc-100 px-4 py-4"><p className="font-semibold text-zinc-900">Conversations</p></div>
      <div className="max-h-[280px] overflow-y-auto lg:max-h-[520px]">
        {conversations.isLoading ? <p className="p-4 text-sm text-zinc-500">Loading conversations…</p> : conversations.data?.length ? conversations.data.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn("flex w-full gap-3 border-b border-zinc-100 px-4 py-4 text-left hover:bg-zinc-50", activeConversationId === item.id && "bg-emerald-50")}> 
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">{nameOf(item.other).slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><span className="truncate text-sm font-semibold text-zinc-900">{nameOf(item.other)}</span>{item.unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-emerald-600" />}</span><span className="block truncate text-xs text-zinc-500">{item.lastMessage?.content ?? item.product?.title ?? "Start the conversation"}</span></span>
        </button>) : <p className="p-4 text-sm text-zinc-500">No conversations yet.</p>}</div>
    </aside>
    <section className="flex min-h-[420px] flex-col">
      {selected ? <><div className="border-b border-zinc-100 px-5 py-4"><p className="font-semibold text-zinc-900">{nameOf(selected.other)}</p><p className="truncate text-xs text-zinc-500">{selected.product?.title ? `About ${selected.product.title}` : "Direct message"}</p></div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50/50 p-5">{messages.isLoading ? <p className="text-sm text-zinc-500">Loading messages…</p> : messages.data?.map((message) => <div key={message.id} className={cn("flex", message.senderId === selected.other?.id ? "justify-start" : "justify-end")}><div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", message.senderId === selected.other?.id ? "bg-white text-zinc-800 shadow-sm" : "bg-emerald-600 text-white")}><p className="whitespace-pre-wrap break-words">{message.content}</p><p className={cn("mt-1 text-[11px]", message.senderId === selected.other?.id ? "text-zinc-400" : "text-emerald-100")}>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</p></div></div>)}</div>
      <form onSubmit={submit} className="flex gap-2 border-t border-zinc-100 p-4"><Input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Write a message…" aria-label="Message" /><Button type="submit" size="icon" disabled={!draft.trim() || send.isPending} aria-label="Send message"><Send className="h-4 w-4" /></Button></form></> : <div className="m-auto px-6 text-center"><p className="font-medium text-zinc-900">Your messages will appear here</p><p className="mt-1 text-sm text-zinc-500">Ask a seller a question from any product page.</p></div>}
    </section>
  </div>;
}
