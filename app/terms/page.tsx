import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 prose prose-zinc">
        <h1 className="text-3xl font-bold text-zinc-900">Terms of Service</h1>
        <p className="text-sm text-zinc-500">Last updated: June 15, 2026 · SmartShop Ghana (UMaT Pilot)</p>

        <section className="mt-8 space-y-4 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">1. Agreement</h2>
          <p>
            By creating an account, browsing, buying, or selling on SmartShop (&quot;the Platform&quot;),
            you agree to these Terms of Service. SmartShop is an AI-powered marketplace operated
            for Ghanaian commerce, currently piloting at the University of Mines and Technology
            (UMaT) campus. If you do not agree, do not use the Platform.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">2. Eligibility</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>You must be at least 18 years old, or 16 with parental consent, to use SmartShop.</li>
            <li>You must provide accurate registration information including a valid email and, where requested, a Ghana-format phone number (+233).</li>
            <li>Sellers must complete identity verification (Ghana Card, selfie, and location validation) before listing products.</li>
            <li>One person may not maintain multiple accounts to manipulate trust scores or evade enforcement.</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900">3. Accounts &amp; Security</h2>
          <p>
            You are responsible for safeguarding your password and for all activity under your account.
            You must verify your phone number to access checkout, seller applications, and dispute
            filing. SmartShop may suspend accounts that show suspicious activity, violate these
            terms, or receive repeated buyer/seller complaints.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">4. Buying on SmartShop</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>All prices are displayed in Ghana Cedis (GHS) unless otherwise stated.</li>
            <li>Orders are binding once payment is confirmed through an approved payment method.</li>
            <li>Buyers must inspect items upon delivery and report issues within the dispute window stated on the order.</li>
            <li>Abuse of refunds, chargebacks, or the dispute system may result in account suspension.</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900">5. Selling on SmartShop</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Sellers must accurately describe products, including condition, price, and availability.</li>
            <li>Prohibited items include counterfeit goods, stolen property, illegal substances, weapons, and any item banned under Ghanaian law.</li>
            <li>Sellers must ship or make items available for campus pickup within the timeframe shown on the listing.</li>
            <li>SmartShop may withhold payouts during active disputes or trust-score investigations.</li>
            <li>Subscription plan limits (product listings, AI features) apply per your selected plan.</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900">6. Trust, Verification &amp; AI Features</h2>
          <p>
            SmartShop uses verification levels, trust scores, and AI-assisted tools (search, scam
            detection, recommendations) to improve safety. These systems are aids, not guarantees.
            You remain responsible for your transactions. SmartShop may recalculate trust scores
            based on order history, verification status, reviews, and reported violations.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">7. Payments</h2>
          <p>
            Payments are processed through approved Ghana-compatible providers. SmartShop is not a
            bank and does not hold deposits except as needed to settle transactions and disputes
            during the pilot. Failed or reversed payments may cancel associated orders.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">8. Disputes</h2>
          <p>
            Buyers and sellers should first attempt to resolve issues through in-app messaging.
            Unresolved disputes may be escalated through SmartShop&apos;s{" "}
            <Link href="/disputes" className="text-emerald-600 hover:underline">Dispute Resolution</Link>{" "}
            process. SmartShop may request evidence (photos, chat logs, delivery proof) and will
            issue a binding decision for the pilot period based on available information.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">9. Acceptable Use</h2>
          <p>You may not:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Harass, defraud, or impersonate other users</li>
            <li>Scrape, reverse-engineer, or overload Platform systems</li>
            <li>Post misleading listings or fake reviews</li>
            <li>Circumvent verification, rate limits, or geographic restrictions</li>
            <li>Use SmartShop for money laundering or unlawful purposes</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900">10. Intellectual Property</h2>
          <p>
            SmartShop branding, software, and content are owned by SmartShop Ghana. Sellers grant
            SmartShop a licence to display product images and descriptions for marketplace
            operation and promotion. You retain ownership of your original content.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">11. Limitation of Liability</h2>
          <p>
            SmartShop connects buyers and sellers and is not the seller of record unless explicitly
            stated. To the fullest extent permitted by Ghanaian law, SmartShop is not liable for
            indirect, incidental, or consequential damages arising from user transactions during
            the pilot. Our total liability for any claim is limited to the fees paid to SmartShop
            in the preceding three months.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">12. Changes &amp; Termination</h2>
          <p>
            We may update these terms for the pilot or general launch. Material changes will be
            notified via email or in-app notice. Continued use after changes constitutes acceptance.
            You may delete your account at any time by contacting support; we may terminate accounts
            that violate these terms.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">13. Governing Law</h2>
          <p>
            These terms are governed by the laws of the Republic of Ghana. Disputes with SmartShop
            shall first be addressed through our support channels, then through courts of competent
            jurisdiction in Ghana.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">14. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <Link href="/help" className="text-emerald-600 hover:underline">Help Center</Link>{" "}
            or email support@smartshop.gh (pilot).
          </p>
        </section>
      </article>
    </PageShell>
  );
}
