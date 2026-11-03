import {
  BarChart3,
  BadgeCheck,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Truck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type AdminPermission =
  | "manageSellers"
  | "manageVerification"
  | "manageSubscriptions"
  | "manageDisputes"
  | "manageSettings";

export interface AdminNavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: AdminPermission;
  badge?: number | string;
  children?: AdminNavItem[];
}

export const adminRoutes = {
  dashboard: "/admin",
  sellerReviews: "/admin/seller-reviews",
  sellerQueue: "/admin/seller-queue",
  verificationCenter: "/admin/verification-center",
  storeApprovals: "/admin/store-approvals",
  subscriptions: "/admin/subscriptions",
  analytics: "/admin/analytics",
  operations: "/admin/operations",
  disputes: "/admin/disputes",
  settings: "/admin/settings",
} as const;

export const adminNavItems: readonly AdminNavItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: adminRoutes.dashboard,
    icon: LayoutDashboard,
  },
  {
    id: "seller-reviews",
    title: "Seller Reviews",
    href: adminRoutes.sellerReviews,
    icon: BadgeCheck,
    permission: "manageSellers",
  },
  {
    id: "seller-queue",
    title: "Seller Queue",
    href: adminRoutes.sellerQueue,
    icon: Clock3,
    permission: "manageSellers",
  },
  {
    id: "verification-center",
    title: "Verification Center",
    href: adminRoutes.verificationCenter,
    icon: FileText,
    permission: "manageVerification",
  },
  {
    id: "store-approvals",
    title: "Store Locations",
    href: adminRoutes.storeApprovals,
    icon: BadgeCheck,
    permission: "manageVerification",
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    href: adminRoutes.subscriptions,
    icon: CreditCard,
    permission: "manageSubscriptions",
  },
  {
    id: "operations",
    title: "Fulfilment & Payouts",
    href: adminRoutes.operations,
    icon: Truck,
    permission: "manageDisputes",
  },
  {
    id: "analytics",
    title: "Analytics",
    href: adminRoutes.analytics,
    icon: BarChart3,
    permission: "manageSubscriptions",
  },
  {
    id: "disputes",
    title: "Disputes",
    href: adminRoutes.disputes,
    icon: MessageSquare,
    permission: "manageDisputes",
  },
  {
    id: "settings",
    title: "Settings",
    href: adminRoutes.settings,
    icon: Settings,
    permission: "manageSettings",
  },
];

function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0] ?? "/";
  const withoutHash = withoutQuery.split("#")[0] ?? "/";
  const normalized = withoutHash === "" ? "/" : withoutHash;

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function isNavItemActive(currentPath: string, navItem: AdminNavItem): boolean {
  const normalizedCurrentPath = normalizePathname(currentPath);
  const normalizedHref = normalizePathname(navItem.href);

  if (normalizedHref === "/admin") {
    return normalizedCurrentPath === normalizedHref;
  }

  return (
    normalizedCurrentPath === normalizedHref ||
    normalizedCurrentPath.startsWith(`${normalizedHref}/`)
  );
}
