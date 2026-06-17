import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help Center",
};

const faqs = [
  {
    q: "How do I verify my phone number?",
    a: "Go to Account Settings → Phone verification. Enter your +233 number and enter the 6-digit code sent via SMS.",
  },
  {
    q: "How do I reset my password?",
    a: "On the sign-in page, click Forgot password?, enter your email, and use the 6-digit code sent to your email or phone.",
  },
  {
    q: "How do I become a seller?",
    a: "Create an account, verify your phone, then visit Become a Seller to submit Ghana Card verification.",
  },
  {
    q: "What payment methods are supported?",
    a: "During the UMaT pilot, supported methods are shown at checkout. All prices are in GHS.",
  },
  {
    q: "How do trust scores work?",
    a: "Trust scores reflect verification level, completed orders, reviews, and dispute history — helping buyers choose reliable sellers.",
  },
];

export default function HelpPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-zinc-900">Help Center</h1>
        <p className="mt-2 text-zinc-600">
          Quick answers for SmartShop buyers and sellers at UMaT.
        </p>

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <Card key={faq.q}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-sm text-zinc-500">
          Still need help? Email support@smartshop.gh or visit{" "}
          <Link href="/disputes" className="text-emerald-600 hover:underline">
            Dispute Resolution
          </Link>{" "}
          for order issues.
        </p>
      </div>
    </PageShell>
  );
}
