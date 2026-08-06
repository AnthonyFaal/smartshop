"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock3,
  BadgeCheck,
  Settings,
  MessageSquare,
  FileText,
  BarChart3,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AdminPageShell({
  children,
  activeHref,
}: {
  children: React.ReactNode;
  activeHref?: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Seller Reviews", href: "/admin/verification", icon: BadgeCheck },
      { label: "Seller Queue", href: "/admin/verification", icon: Clock3 },
      { label: "Verification Center", href: "/admin/verification/ghana-card", icon: FileText },
      { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      { label: "Analytics", href: "/admin/subscriptions", icon: BarChart3 },
      { label: "Disputes", href: "/disputes", icon: MessageSquare },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
    []
  );

  return (
    <div className="flex min-h-full">
      {/* Mobile sidebar */}
      <div className="md:hidden">
        {mobileOpen ? (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside
              className="absolute left-0 top-0 h-full w-[85%] max-w-xs overflow-y-auto bg-white shadow-lg"
              aria-label="Admin navigation"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <div className="text-sm font-semibold text-zinc-900">
                  Admin Menu
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="p-2">
                {navItems.map((item) => {
                  const isActive =
                    current === item.href || current.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-zinc-700 hover:bg-zinc-50"
                      )}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : (
          <div className="fixed left-4 top-16 z-50">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white md:block"
        aria-label="Admin navigation"
      >
        <div className="px-4 py-5">
          <div className="text-sm font-semibold text-zinc-900">Admin</div>
          <div className="mt-1 text-xs text-zinc-500">
            SmartShop operations & trust controls
          </div>
        </div>
        <nav className="px-2 pb-6">
          {navItems.map((item) => {
            const isActive =
              current === item.href || current.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-zinc-700 hover:bg-zinc-50"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
