import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dispute Resolution",
};

export default function DisputesPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-zinc-900">Dispute Resolution</h1>
        <p className="mt-2 text-zinc-600">
          Fair, transparent process for order issues on SmartShop.
        </p>

        <ol className="mt-10 list-decimal space-y-6 pl-6 text-zinc-700">
          <li>
            <strong className="text-zinc-900">Contact the seller first</strong> — use{" "}
            <Link href="/messages" className="text-emerald-600 hover:underline">Messages</Link>{" "}
            to describe the issue and agree on a fix when possible.
          </li>
          <li>
            <strong className="text-zinc-900">Gather evidence</strong> — photos of the item,
            delivery timestamps, and chat history help us decide quickly.
          </li>
          <li>
            <strong className="text-zinc-900">Open a dispute from your order</strong> — go to{" "}
            <Link href="/orders" className="text-emerald-600 hover:underline">Orders</Link>{" "}
            and select &quot;Report issue&quot; within 7 days of delivery (pilot policy).
          </li>
          <li>
            <strong className="text-zinc-900">SmartShop review</strong> — our team reviews both
            sides and may issue a refund, partial refund, or reject the claim if evidence is insufficient.
          </li>
        </ol>

        <div className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm text-zinc-600">
            Phone verification is required to file disputes. Complete verification in{" "}
            <Link href="/settings" className="text-emerald-600 hover:underline">Settings</Link>{" "}
            before escalating an order.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/orders">View my orders</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
