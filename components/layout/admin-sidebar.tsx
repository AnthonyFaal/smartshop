"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { adminNavItems, isNavItemActive, type AdminNavItem } from "@/lib/admin/navigation";

type AdminSidebarProps = {
  currentPath?: string;
  className?: string;
};

function AdminSidebarItem({ item, isActive, onNavigate }: { item: AdminNavItem; isActive: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600",
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "text-zinc-700 hover:bg-zinc-50"
      )}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-4 w-4" />
      <span>{item.title}</span>
    </Link>
  );
}

function AdminSidebarContent({ currentPath, onNavigate, mobile }: { currentPath: string; onNavigate?: () => void; mobile?: boolean }) {
  return (
    <nav className={cn("space-y-1", mobile ? "p-2" : "px-2 pb-6")} aria-label="Admin navigation">
      {adminNavItems.map((item) => {
        const isActive = isNavItemActive(currentPath, item);

        return <AdminSidebarItem key={item.id} item={item} isActive={isActive} onNavigate={onNavigate} />;
      })}
    </nav>
  );
}

export function DesktopAdminSidebar({ currentPath }: AdminSidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white md:block" aria-label="Admin navigation">
      <div className="px-4 py-5">
        <div className="text-sm font-semibold text-zinc-900">Admin</div>
        <div className="mt-1 text-xs text-zinc-500">SmartShop operations & trust controls</div>
      </div>
      <AdminSidebarContent currentPath={currentPath ?? "/admin"} />
    </aside>
  );
}

export function MobileAdminSidebar({ currentPath }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="md:hidden">
      {mobileOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 h-full w-[85%] max-w-xs overflow-y-auto bg-white shadow-lg" aria-label="Admin navigation">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div className="text-sm font-semibold text-zinc-900">Admin Menu</div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <AdminSidebarContent currentPath={currentPath ?? "/admin"} onNavigate={() => setMobileOpen(false)} mobile />
          </aside>
        </div>
      ) : (
        <div className="fixed left-4 top-16 z-50">
          <Button variant="outline" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const pathname = usePathname();
  const activePath = currentPath ?? pathname ?? "/admin";

  return (
    <>
      <MobileAdminSidebar currentPath={activePath} />
      <DesktopAdminSidebar currentPath={activePath} />
    </>
  );
}
