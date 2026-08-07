import { describe, expect, it } from "vitest";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { isNavItemActive, type AdminNavItem } from "@/lib/admin/navigation";

describe("isNavItemActive", () => {
  const dashboardItem: AdminNavItem = {
    id: "dashboard",
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  };

  const verificationItem: AdminNavItem = {
    id: "verification-center",
    title: "Verification Center",
    href: "/admin/verification-center",
    icon: ShieldCheck,
  };

  it("activates only the dashboard on the exact admin root", () => {
    expect(isNavItemActive("/admin", dashboardItem)).toBe(true);
    expect(isNavItemActive("/admin", verificationItem)).toBe(false);
  });

  it("activates a parent section for nested child routes without false positives", () => {
    expect(isNavItemActive("/admin/seller-reviews", {
      id: "seller-reviews",
      title: "Seller Reviews",
      href: "/admin/seller-reviews",
      icon: ShieldCheck,
    })).toBe(true);
    expect(isNavItemActive("/admin/seller-reviews/123", {
      id: "seller-reviews",
      title: "Seller Reviews",
      href: "/admin/seller-reviews",
      icon: ShieldCheck,
    })).toBe(true);
    expect(isNavItemActive("/admin/settings/profile", {
      id: "settings",
      title: "Settings",
      href: "/admin/settings",
      icon: ShieldCheck,
    })).toBe(true);
    expect(isNavItemActive("/admin/verification-center", verificationItem)).toBe(true);
    expect(isNavItemActive("/admin/verification-center/123", verificationItem)).toBe(true);
    expect(isNavItemActive("/admin/verification", verificationItem)).toBe(false);
  });
});
