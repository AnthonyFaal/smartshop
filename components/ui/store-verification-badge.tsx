import { BadgeCheck, Clock3, ShieldAlert, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StoreVerificationStatus } from "@prisma/client";

const config: Record<
  StoreVerificationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "verified"; icon?: React.ComponentType<{ className?: string }> }
> = {
  VERIFIED: { label: "Verified", variant: "verified", icon: BadgeCheck },
  PENDING: { label: "Pending", variant: "outline", icon: Clock3 },
  UNDER_REVIEW: { label: "Under review", variant: "secondary", icon: Clock3 },
  REJECTED: { label: "Rejected", variant: "destructive", icon: ShieldX },
  SUSPENDED: { label: "Suspended", variant: "destructive", icon: ShieldAlert },
};

export function StoreVerificationBadge({
  status,
  showIcon = true,
}: {
  status: StoreVerificationStatus;
  showIcon?: boolean;
}) {
  const item = config[status] ?? config.PENDING;
  const Icon = item.icon;

  return (
    <Badge variant={item.variant} className="gap-1">
      {showIcon && Icon ? <Icon className="h-3 w-3" /> : null}
      {item.label}
    </Badge>
  );
}
