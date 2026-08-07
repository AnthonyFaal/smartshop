import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-zinc-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: June 15, 2026 · SmartShop Ghana</p>

        <section className="mt-8 space-y-4 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">1. Overview</h2>
          <p>
            SmartShop (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains what data we
            collect, why we collect it, and your choices — especially during the UMaT campus pilot.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">2. Data We Collect</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Account data:</strong> name, email, phone number, password (hashed), role</li>
            <li><strong>Verification data:</strong> Ghana Card details and selfie images for seller verification</li>
            <li><strong>Transaction data:</strong> orders, cart, payments, messages, reviews</li>
            <li><strong>Technical data:</strong> IP address, device/browser info, session identifiers, audit logs</li>
            <li><strong>AI interaction data:</strong> search queries and AI feature usage (for quotas and improvement)</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900">3. How We Use Data</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Provide marketplace, checkout, messaging, and seller tools</li>
            <li>Verify identity, calculate trust scores, and detect fraud</li>
            <li>Send OTP codes, order updates, and security notifications</li>
            <li>Improve AI search, recommendations, and scam detection</li>
            <li>Comply with legal obligations and resolve disputes</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900">4. Sharing</h2>
          <p>We do not sell your personal data. We may share data with:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Payment and SMS providers to complete transactions and verification</li>
            <li>Cloud infrastructure providers (hosting, storage, cache) under data-processing terms</li>
            <li>Law enforcement when required by Ghanaian law</li>
            <li>Other users — only what is necessary (e.g. seller name, store info, public listings)</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-900">5. Retention &amp; Security</h2>
          <p>
            We retain account and transaction records as needed for operations, disputes, and legal
            compliance. Passwords are hashed with bcrypt. Sessions use HttpOnly cookies. Verification
            documents are stored in private, access-controlled storage.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">6. Your Rights</h2>
          <p>You may request access, correction, or deletion of your personal data by contacting
            support. Phone verification and seller verification may be required to process certain
            requests securely. You can update your password in{" "}
            <Link href="/settings" className="text-emerald-600 hover:underline">Account Settings</Link>.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">7. Cookies</h2>
          <p>
            We use essential cookies for authentication (access and refresh tokens). We do not use
            third-party advertising cookies during the pilot.
          </p>

          <h2 className="text-xl font-semibold text-zinc-900">8. Contact</h2>
          <p>
            Privacy questions:{" "}
            <Link href="/help" className="text-emerald-600 hover:underline">Help Center</Link>{" "}
            or privacy@smartshop.gh (pilot).
          </p>
        </section>
      </article>
    </PageShell>
  );
}
