import { releaseExpiredPendingPayments } from "@/server/services/order.service";
import { refreshAvailableSettlements } from "@/server/services/settlement.service";

/** Run by the platform scheduler; safe to call repeatedly. */
export async function runOperationalMaintenance() {
  const [releasedPayments, releasedSettlements] = await Promise.all([
    releaseExpiredPendingPayments(),
    refreshAvailableSettlements(),
  ]);
  return { releasedPayments: releasedPayments ?? 0, releasedSettlements: releasedSettlements.count };
}
