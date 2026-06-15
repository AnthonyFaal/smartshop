import Link from "next/link";
import { Store } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                <Store className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">SmartShop</span>
            </div>
            <p className="text-sm text-zinc-500">
              Ghana&apos;s trusted AI-powered marketplace. Buy and sell with confidence.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Marketplace</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><Link href="/marketplace" className="hover:text-emerald-600">Browse Products</Link></li>
              <li><Link href="/seller/verify" className="hover:text-emerald-600">Become a Seller</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><Link href="/help" className="hover:text-emerald-600">Help Center</Link></li>
              <li><Link href="/disputes" className="hover:text-emerald-600">Dispute Resolution</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><Link href="/privacy" className="hover:text-emerald-600">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-emerald-600">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-zinc-200 pt-8 text-center text-sm text-zinc-400">
          © {new Date().getFullYear()} SmartShop Ghana. Pilot: UMaT Campus.
        </div>
      </div>
    </footer>
  );
}
