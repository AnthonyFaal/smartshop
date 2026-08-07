import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageShell } from "@/components/layout/page-shell";
import { adminRoutes } from "@/lib/admin/navigation";
import Link from "next/link";

export default function AdminSellerQueuePage() {
  return (
    <PageShell>
      <AdminPageShell activeHref={adminRoutes.sellerQueue}>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Seller Queue</p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Pending seller applications</h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-600">
              The queue now has its own canonical route and remains isolated from the broader review experience.
            </p>
            <div className="mt-6">
              <Link href={adminRoutes.verificationCenter} className="text-sm font-medium text-emerald-700 hover:underline">
                Continue to verification center
              </Link>
            </div>
          </div>
        </main>
      </AdminPageShell>
    </PageShell>
  );
}
