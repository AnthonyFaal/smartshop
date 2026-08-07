import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { PageShell } from "@/components/layout/page-shell";
import { adminRoutes } from "@/lib/admin/navigation";

export default function AdminDisputesPage() {
  return (
    <PageShell>
      <AdminPageShell activeHref={adminRoutes.disputes}>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Disputes</p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-900">Dispute management center</h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-600">
              The disputes workspace now lives under the admin route namespace.
            </p>
          </div>
        </main>
      </AdminPageShell>
    </PageShell>
  );
}
